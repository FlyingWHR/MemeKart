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
import { useFrame, useLoader } from "@react-three/fiber";
import { LUTPass, LUTCubeLoader } from "three-stdlib";
import { useCurvedPathPoints } from "./useCurvedPath";
import { ParisBis } from "./models/tracks/Paris-bis";
import { Skid } from "./Skid";
import { Dust } from "./Dust";
import { CuboidCollider } from "@react-three/rapier";
import { useAudioFallback } from "./useAudioFallback";
import { useErrorTracker } from './ErrorTracker';
import { SafePositionalAudio } from './SafePositionalAudio';

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
    isRaceFinished
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
  
  useEffect(() => {
    // Allow toggling checkpoint visibility for debugging
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
    if (gameStarted) {
      // Increment race timer if game has started
      actions.incrementRaceTime(delta);
    } else {
      // Existing camera animation logic when game hasn't started
      const camera = cam.current;
      if (currentPoint < pointest.length - 1) {
        camera.position.lerp(pointest[currentPoint], delta * speedFactor);
        lookAtTarget.current.position.lerp(
          pointest[currentPoint + 1],
          delta * speedFactor
        );
        camera.lookAt(lookAtTarget.current.position);

        if (camera.position.distanceTo(pointest[currentPoint]) < 5) {
          setCurrentPoint(currentPoint + 1);
        }
      } else {
        setCurrentPoint(0);
      }
    }
  });

  return (
    <>
      {gameStarted &&
        players.map((player) => {
          const ControllerComponent =
            controls === "keyboard"
              ? PlayerControllerKeyboard
              : controls === "gamepad"
              ? PlayerControllerGamepad
              : controls === "touch"
              ? PlayerControllerTouch
              : PlayerController;

          // Only show controller for active racers
          return !isRaceFinished || player.id !== id ? (
            <ControllerComponent
              key={player.id}
              player={player}
              userPlayer={player.id === myPlayer()?.id}
              setNetworkBananas={setNetworkBananas}
              setNetworkShells={setNetworkShells}
              networkBananas={networkBananas}
              networkShells={networkShells}
            />
          ) : null;
        })}
      {gameStarted &&
        players.map((player) => (
          <PlayerDummies
            key={player.id}
            player={player}
            userPlayer={player.id === myPlayer()?.id}
          />
        ))}
      {!gameStarted && (
        <>
          <mesh ref={lookAtTarget}></mesh>
          <PerspectiveCamera
            ref={cam}
            makeDefault
            position={[0, 2, 0]}
            far={5000}
          />
        </>
      )}

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
    </>
  );
};
