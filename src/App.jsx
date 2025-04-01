import { Canvas } from '@react-three/fiber'
import { Experience } from './components/Experience'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { Physics } from '@react-three/rapier'
import { KeyboardControls, Preload } from '@react-three/drei'
import { insertCoin, onPlayerJoin } from 'playroomkit'
import { useStore } from "./components/store";
import * as THREE from "three";
import { CustomLoader } from './components/CustomLoader'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErrorTracker } from './components/ErrorTracker'

export const Controls = {
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
  boost: 'boost',
  shoot: 'shoot',
  slow: 'slow',
  reset: 'reset',
  escape: 'escape'
}

function App() {
  const map = useMemo(
    () => [
      { name: Controls.up, keys: ['KeyW', 'ArrowUp'] },
      { name: Controls.down, keys: ['KeyS', 'ArrowDown'] },
      { name: Controls.left, keys: ['KeyA', 'ArrowLeft'] },
      { name: Controls.right, keys: ['KeyD', 'ArrowRight'] },
      { name: Controls.jump, keys: ['Space'] },
      { name: Controls.slow, keys: ['Shift'] },
      { name: Controls.shoot, keys: ['KeyE', 'Click'] },
      { name: Controls.reset, keys: ['KeyR'] },
      { name: Controls.escape, keys: ['Escape']}
    ],
    []
  )

  const { actions } = useStore();
  const [initError, setInitError] = useState(null);

  const start = async () => {
    try {
      // Reset lap counter and timer before starting
      actions.resetRace(); 

      // Try to initialize PlayroomKit, but continue even if it fails
      try {
        await insertCoin({ skipLobby: true });
        
        onPlayerJoin((state) => {
          actions.addPlayer(state);
          actions.setId(state.id);

          state.onQuit(() => {
            actions.removePlayer(state);
          });
        });
      } catch (error) {
        console.warn("PlayroomKit initialization failed:", error);
        setInitError("Multiplayer features unavailable");
        
        // Create a local player so the game still works in single player
        const localPlayer = {
          id: 'local-player',
          onQuit: () => {},
        };
        actions.addPlayer(localPlayer);
        actions.setId(localPlayer.id);
      }
    } catch (error) {
      console.error("Failed to initialize game:", error);
      setInitError("Game initialization failed. Please reload the page.");
    }
  }

  useEffect(() => {
    start();
  }, [])

  return (
    <ErrorTracker>
      <CustomLoader />
      {initError && (
        <div className="init-error">
          <p>{initError}</p>
        </div>
      )}
      <Canvas
        // shadows
        dpr={1}
        gl={{ 
          antialias: false, 
          stencil: false, 
          depth: false, 
          powerPreference: 'high-performance',
          // Add an error handler for WebGL context loss
          onContextLost: (event) => {
            console.warn("WebGL context lost:", event);
            event.preventDefault();
            // You might want to try to restore the context after a delay
            setTimeout(() => {
              const canvas = event.target;
              const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
              if (gl) {
                console.log("WebGL context restored");
              }
            }, 1000);
          }
        }}
        mode="concurrent"
        onCreated={({ gl, camera }) => {
            gl.toneMapping = THREE.AgXToneMapping
            gl.setClearColor(0x000000, 0)
          }}>
        <Suspense fallback={null}>
          <Preload all />
          <Physics
            gravity={[0, -90, 0]}
            timeStep={'vary'}
          >
            <KeyboardControls map={map}>
              <ErrorBoundary fallback={(error) => (
                // For critical errors only - simple red indicator
                <group>
                  <mesh position={[0, 2, 0]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="red" />
                  </mesh>
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} intensity={1} />
                </group>
              )}>
                <Experience />
              </ErrorBoundary>
            </KeyboardControls>
          </Physics>
        </Suspense>
      </Canvas>
    </ErrorTracker>
  )
}

export default App
