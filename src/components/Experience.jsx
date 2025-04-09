import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
  Lightformer,
  Bvh,
  PositionalAudio,
} from "@react-three/drei";
import { Ground } from "./Ground";
import { PlayerController } from "./PlayerController";
import { PlayerControllerGamepad } from "./PlayerControllerGamepad";
import { PlayerControllerKeyboard } from "./PlayerControllerKeyboard";
import { PlayerControllerTouch } from "./PlayerControllerTouch";
import { Paris } from "./models/tracks/Tour_paris_promenade";
import {
  EffectComposer,
  N8AO,
  Bloom,
  TiltShift2,
  HueSaturation,
  SMAA,
  ChromaticAberration,
  Vignette,
  LUT,
} from "@react-three/postprocessing";
import { Banana } from "./models/items/Banana_peel_mario_kart";
import { ItemBox } from "./models/misc/Gift";
import { useStore } from "./store";
import { Shell } from "./models/items/Mario_shell_red";
import { Coin } from "./models/misc/Super_mario_bros_coin";
import {
  RPC,
  getState,
  insertCoin,
  isHost,
  myPlayer,
  onPlayerJoin,
  useMultiplayerState,
} from "playroomkit";
import { PlayerDummies } from "./PlayerDummies";
import { useEffect, useState, useRef, forwardRef } from "react";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
import { LUTPass, LUTCubeLoader } from "three-stdlib";
import { useCurvedPathPoints } from "./useCurvedPath";
import { ParisBis } from "./models/tracks/Paris-bis";
import { Skid } from "./Skid";
import { Dust } from "./Dust";
import { CuboidCollider } from "@react-three/rapier";
import { useAudioFallback } from "./useAudioFallback";
import { useErrorTracker } from './ErrorTracker';
import { SafePositionalAudio } from './SafePositionalAudio';
import { VehicleStatsDebug } from './VehicleStatsDebug';

// Define checkpoints - positions around the track
const checkpoints = [
  // Start/Finish line - also serves as the last checkpoint
  { position: [-20, 2, -119], size: [10, 5, 2], isFinishLine: true, index: 0 },
  // Checkpoint 1 - after first turn
  { position: [-80, 2, -90], size: [2, 5, 10], index: 1 },
  // Checkpoint 2 - halfway point
  { position: [0, 2, -20], size: [10, 5, 2], index: 2 },
  // Checkpoint 3 - after second major turn
  { position: [80, 2, -90], size: [2, 5, 10], index: 3 }
];

// Checkpoint visualization component (for debugging)
const CheckpointVisual = ({ position, size, isFinishLine }) => {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial 
        color={isFinishLine ? "#00ff00" : "#ff0000"} 
        transparent 
        opacity={0.3} 
      />
    </mesh>
  );
};

export const Experience = () => {
  const onCollide = (event) => {};
  const { 
    gameStarted, 
    bananas, 
    shells, 
    players, 
    id, 
    actions, 
    controls, 
    nextCheckpointIndex,
    currentLap,
    totalLaps,
    isRaceFinished,
    countdownActive,
    kartPlacedOnGround,
    selectionActive
  } = useStore();
  const [networkBananas, setNetworkBananas] = useMultiplayerState(
    "bananas",
    []
  );

  const { points, loading, error } = useCurvedPathPoints("./CurvedPath.json");

  const [networkShells, setNetworkShells] = useMultiplayerState("shells", []);
  const [pointest, setPointest] = useState([]);
  const [currentPoint, setCurrentPoint] = useState(0);
  
  // Player position tracking for checkpoint detection
  const [playerCheckpointState, setPlayerCheckpointState] = useMultiplayerState(
    "checkpoints",
    { nextCheckpoint: 0, currentLap: 1 }
  );
  
  // Display debug info
  const [showCheckpoints, setShowCheckpoints] = useState(false);
  
  const lapCompleteSound = useRef();
  const raceFinishSound = useRef();
  
  // Add a ref to track when the kart is initially positioned
  const kartPositioned = useRef(false);
  
  // Get the renderer from the Three.js context
  const { gl } = useThree();
  
  // Set up reduced frame rate during character selection
  useEffect(() => {
    if (selectionActive) {
      // If in selection mode, reduce frame rate to 10 fps to save resources
      const originalSetAnimationLoop = gl.setAnimationLoop;
      let lastTime = 0;
      const interval = 1000 / 10; // 10 fps
      
      const throttledLoop = (callback) => {
        gl.setAnimationLoop((time) => {
          if (time - lastTime >= interval) {
            lastTime = time;
            if (callback) callback(time);
          }
        });
      };
      
      // Store original animation loop function
      const originalAnimationLoop = gl._animationLoop;
      
      // Apply throttled loop
      throttledLoop(originalAnimationLoop);
      
      // Restore original animation loop when selection ends
      return () => {
        gl.setAnimationLoop(originalAnimationLoop);
      };
    }
  }, [selectionActive, gl]);

  useEffect(() => {
    if (points) {
      //This is adjusted to Paris scale
      const scaledPoints = points.map((point) => ({
        x: point.x * 50,
        y: point.y * 50,
        z: point.z * 50,
      }));
      setPointest(scaledPoints.reverse());
    }
  }, [points]);

  // Handle checkpoint collision
  const handleCheckpointCollision = (playerObj, checkpointIndex, isFinishLine) => {
    if (playerObj.id !== id) return; // Only process for local player
    if (isRaceFinished) return; // Don't process checkpoints if race is already finished
    
    // Check if this is the next expected checkpoint
    if (checkpointIndex === nextCheckpointIndex) {
      // Update player's next checkpoint
      const nextIndex = (checkpointIndex + 1) % checkpoints.length;
      actions.setNextCheckpoint(nextIndex);
      
      // Update networked state
      setPlayerCheckpointState({
        nextCheckpoint: nextIndex,
        currentLap: currentLap
      });
      
      // If player crossed finish line and completed a full lap
      if (isFinishLine && nextCheckpointIndex === 0) {
        // Increment lap only if player has passed through all checkpoints
        actions.incrementLap();
        
        // Play lap completion sound
        if (lapCompleteSound.current && lapCompleteSound.current.play) {
          try {
            lapCompleteSound.current.play();
          } catch (error) {
            console.warn("Could not play lap completion sound:", error);
          }
        }
        
        // Check if race is finished
        if (currentLap >= totalLaps - 1) { // -1 because we increment before checking
          // Race finished!
          actions.finishRace();
          
          // Play race finish sound
          if (raceFinishSound.current && raceFinishSound.current.play) {
            try {
              raceFinishSound.current.play();
            } catch (error) {
              console.warn("Could not play race finish sound:", error);
            }
          }
        }
      }
    }
  };

  const testing = getState("bananas");
  const cam = useRef();
  const lookAtTarget = useRef();
  
  const speedFactor = 5;
  const { texture } = useLoader(LUTCubeLoader, "./cubicle-99.CUBE");
  useFrame((state, delta) => {
    if (gameStarted && !countdownActive) {
      // Game is fully active - increment race timer
      actions.incrementRaceTime(delta);
    } else if (!gameStarted) {
      // Not started yet - use the cinematic camera 
      const camera = cam.current;
      if (camera && lookAtTarget.current && currentPoint < pointest.length - 1) {
        camera.position.lerp(pointest[currentPoint], delta * speedFactor);
        lookAtTarget.current.position.lerp(
          pointest[currentPoint + 1],
          delta * speedFactor
        );
        camera.lookAt(lookAtTarget.current.position);

        if (camera.position.distanceTo(pointest[currentPoint]) < 5) {
          setCurrentPoint(currentPoint + 1);
        }
      } else if (camera && lookAtTarget.current) {
        setCurrentPoint(0);
      }
    } else if (gameStarted && countdownActive) {
      // When game started and countdown is active - handle kart falling and landing
      if (players.length > 0) {
        // Find the local player
        const localPlayer = players.find(p => p.id === id);
        
        if (localPlayer && localPlayer.body) {
          // Get current position of the kart
          const kartPosition = localPlayer.body.translation();
          
          // Check if kart has landed (y position close to 2, which is ground level)
          if (!kartPlacedOnGround && kartPosition.y <= 2.5) {
            console.log("Kart has landed on the ground");
            
            // Ensure the kart is exactly at ground level
            localPlayer.body.setTranslation({ 
              x: kartPosition.x, 
              y: 2, 
              z: kartPosition.z 
            }, true);
            
            // Mark as positioned on ground
            actions.setKartPlacedOnGround(true);
          }
          
          // If kart hasn't been positioned yet, apply gravity manually
          // (this helps with smoother falling and camera following)
          if (!kartPlacedOnGround && kartPosition.y > 2.5) {
            // Apply gravity to make the kart fall naturally
            localPlayer.body.applyImpulse({ x: 0, y: -9.8 * 3, z: 0 }, true);
          }
        }
      }
    }
  });

  // We'll keep this function to be called by the HUD countdown
  const handleCountdownComplete = () => {
    // This will be handled by the HUD countdown component now
    // We can remove this function later if needed
  };

  // Place kart at starting position when game starts
  useEffect(() => {
    if (gameStarted && players.length > 0 && !kartPlacedOnGround) {
      console.log("Attempting to place kart on ground");
      
      // Find the local player
      const localPlayer = players.find(p => p.id === id);
      console.log("Local player:", localPlayer);
      
      // Position the kart at the starting position ON THE TRACK but ELEVATED IN THE AIR
      const startPosition = [-20, 60, -119]; // Starting line position but elevated in the air
      
      // Wait for body to be initialized
      if (localPlayer && localPlayer.body) {
        console.log("Found player body, placing kart at starting position in the air");
        try {
          // Set position high in the air
          localPlayer.body.setTranslation({ 
            x: startPosition[0], 
            y: startPosition[1], // Elevated position
            z: startPosition[2] 
          }, true);
          
          // Zero out any velocities to ensure a clean drop
          localPlayer.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          localPlayer.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
          
          // Set rotation to face forward down the track (along the positive Z direction)
          localPlayer.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
          
          console.log("Kart placed at elevated starting position");
          
          // Mark kart as placed and start countdown immediately
          // We're not setting kartPlacedOnGround to true yet - that will happen when it actually lands
          actions.startCountdown();
          console.log("Countdown started while kart is falling");
        } catch (error) {
          console.error("Error placing kart:", error);
        }
      } else {
        console.log("Player body not found, setting a retry timer");
        // Retry after a short delay if body is not yet initialized
        const timer = setTimeout(() => {
          if (!kartPlacedOnGround) {
            actions.startCountdown();
            console.log("Forcing countdown start after delay");
          }
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [gameStarted, players, id, kartPlacedOnGround, actions]);

  // Allow toggling checkpoint visibility for debugging
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'c') {
        setShowCheckpoints(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      {/* Only use cinematic camera when the game hasn't started at all */}
      {!gameStarted ? (
        <>
          <mesh ref={lookAtTarget}></mesh>
          <PerspectiveCamera
            ref={cam}
            makeDefault
            position={[0, 2, 0]}
            far={5000}
          />
        </>
      ) : (
        // For both countdown and active gameplay, use the camera from the player controller
        // This ensures camera consistency between countdown and gameplay
        players.map((player) => {
          const ControllerComponent =
            controls === "keyboard"
              ? PlayerControllerKeyboard
              : controls === "gamepad"
              ? PlayerControllerGamepad
              : controls === "touch"
              ? PlayerControllerTouch
              : PlayerController;

          return player.id === id ? (
            <ControllerComponent
              key={player.id}
              player={player}
              userPlayer={player.id === myPlayer()?.id}
              setNetworkBananas={setNetworkBananas}
              setNetworkShells={setNetworkShells}
              networkBananas={networkBananas}
              networkShells={networkShells}
              countdownFreeze={countdownActive} // Pass countdown state to controllers
            />
          ) : null;
        })
      )}
      
      {/* Show player dummies regardless of countdown state */}
      {gameStarted &&
        players.map((player) => (
          <PlayerDummies
            key={player.id}
            player={player}
            userPlayer={player.id === myPlayer()?.id}
          />
        ))}
        
      <ParisBis position={[0, 0, 0]} />
      <ItemBox position={[-20, 2.5, -119]} />
      <Coin position={[-30, 2, -119]} />
      <Skid />
      <Dust />

      {/* Checkpoint colliders */}
      {checkpoints.map((checkpoint, idx) => (
        <group key={`checkpoint-${idx}`}>
          {/* Invisible collider */}
          <CuboidCollider
            position={checkpoint.position}
            args={checkpoint.size}
            sensor
            onIntersectionEnter={(e) => {
              const playerBody = e.other;
              // Check if it's a player that entered the checkpoint
              if (playerBody.rigidBodyObject?.name === "player") {
                handleCheckpointCollision(
                  players.find(p => p.id === id), 
                  checkpoint.index,
                  checkpoint.isFinishLine
                );
              }
            }}
            userData={{ 
              type: 'checkpoint', 
              index: checkpoint.index,
              isFinishLine: checkpoint.isFinishLine || false
            }}
          />
          
          {/* Visual representation (only shown when debugging) */}
          {showCheckpoints && (
            <CheckpointVisual 
              position={checkpoint.position}
              size={checkpoint.size}
              isFinishLine={checkpoint.isFinishLine}
            />
          )}
        </group>
      ))}

      <Ground position={[0, 0, 0]} />
      <Environment resolution={256} preset="lobby" />
      {networkBananas.map((banana) => (
        <Banana
          key={banana.id}
          position={banana.position}
          setNetworkBananas={setNetworkBananas}
          networkBananas={networkBananas}
          id={banana.id}
        />
      ))}
      {networkShells.map((shell) => (
        <Shell
          key={shell.id}
          id={shell.id}
          position={shell.position}
          rotation={shell.rotation}
          setNetworkShells={setNetworkShells}
          networkShells={networkShells}
        />
      ))}

      <directionalLight
        position={[10, 50, -30]}
        intensity={1}
        shadow-bias={-0.0001}
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-300}
        shadow-camera-right={300}
        shadow-camera-top={300}
        shadow-camera-bottom={-300}
        castShadow
      />

      <EffectComposer
        multisampling={0}
        disableNormalPass
        disableSSAO
        disableDepthPass
      >
        <SMAA />
        <Bloom
          luminanceThreshold={0}
          mipmapBlur
          luminanceSmoothing={0.01}
          intensity={0.5}
        />
        <TiltShift2 />
        <HueSaturation saturation={0.05} />
      </EffectComposer>

      {/* Sound effects */}
      <SafePositionalAudio
        ref={lapCompleteSound}
        url="./sounds/lap_complete.mp3" 
        distance={5}
        loop={false}
      />
      
      <SafePositionalAudio
        ref={raceFinishSound}
        url="./sounds/race_finish.mp3"
        distance={5}
        loop={false}
      />

      <VehicleStatsDebug />
    </>
  );
};
