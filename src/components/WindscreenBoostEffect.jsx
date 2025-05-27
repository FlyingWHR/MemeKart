import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from './store'; // Adjust path if necessary

const MAX_PARTICLES = 120; // Max number of particles
const PARTICLE_LIFETIME_MS = 450; // How long each particle lasts (slightly shorter)
const SPAWN_INTERVAL_MS = 8; // How often to spawn a new particle when boosting (slightly faster)

function WindscreenParticle({ texture, viewport, particleId }) { // Renamed id to particleId for clarity
  const ref = useRef();
  const [visible, setVisible] = useState(true);
  
  const { width: vpWidth, height: vpHeight } = viewport;

  // Initial position closer to the center, spreading outwards
  const [position] = useState(() => [
    (Math.random() - 0.5) * vpWidth * 0.1, // Start very close to center
    (Math.random() - 0.5) * vpHeight * 0.1,
    0, // Z position, should be in front of other content if using a separate UI scene or ortho cam
  ]);
  
  const [initialScale] = useState(() => Math.random() * 0.02 + 0.008); // Smaller initial size

  const velocity = useMemo(() => {
    const dx = position[0] !== 0 ? position[0] : (Math.random() - 0.5) * 0.01; // Avoid zero division, ensure some direction
    const dy = position[1] !== 0 ? position[1] : (Math.random() - 0.5) * 0.01;
    const angleToCenter = Math.atan2(dy, dx);
    const angle = angleToCenter + (Math.random() - 0.5) * (Math.PI / 6); // Slightly less spread
    // Speed scaled by viewport dimension, ensuring particles reach edges
    const speedMagnitude = (Math.random() * 0.7 + 0.3) * Math.max(vpWidth, vpHeight) * 2.0; // Adjusted speed
    return new THREE.Vector3(Math.cos(angle) * speedMagnitude, Math.sin(angle) * speedMagnitude, 0);
  }, [position, vpWidth, vpHeight]);

  const startTime = useMemo(() => Date.now(), []);

  useFrame((state, delta) => {
    if (!ref.current || !visible) return;

    const elapsedTime = Date.now() - startTime;
    if (elapsedTime > PARTICLE_LIFETIME_MS) {
      setVisible(false);
      return;
    }

    ref.current.position.x += velocity.x * delta;
    ref.current.position.y += velocity.y * delta;

    const lifeRatio = Math.max(0, 1 - elapsedTime / PARTICLE_LIFETIME_MS);
    if (ref.current.material) {
      ref.current.material.opacity = lifeRatio * 0.5; // Max opacity 0.5
    }
    // Scale effect: start small, grow fast, then shrink slowly
    const scaleProgress = Math.sin( (1-lifeRatio) * Math.PI * 0.5 ); // Starts small, grows to initialScale
    ref.current.scale.setScalar(initialScale * (scaleProgress + 0.2) * (lifeRatio * 2 + 0.5) ); // Grow then shrink
  });

  if (!visible) return null;

  return (
    <sprite ref={ref} position={position} scale={initialScale}>
      <spriteMaterial map={texture} color="white" transparent depthTest={false} depthWrite={false} />
    </sprite>
  );
}

export function WindscreenBoostEffect() {
  const isDriftBoosting = useStore(state => state.isDriftBoosting); 
  const isItemBoosting = useStore(state => state.isItemBoosting); 
  const isAnyBoosting = isDriftBoosting || isItemBoosting;

  const [particles, setParticles] = useState([]);
  const { viewport } = useThree(); 
  const streakTexture = useTexture('/particles/star.png'); 
  const lastSpawnTimeRef = useRef(0);
  const particleIdCounterRef = useRef(0);

  useFrame(() => {
    if (isAnyBoosting) {
      const now = Date.now();
      if (now - lastSpawnTimeRef.current > SPAWN_INTERVAL_MS) {
        if (particles.length < MAX_PARTICLES) {
          const newParticleId = particleIdCounterRef.current++;
          setParticles(prev => [...prev, { id: newParticleId, spawnTime: now, texture: streakTexture, viewport }]);
        }
        lastSpawnTimeRef.current = now;
      }
    }
    // Cleanup old particles
    setParticles(prev => prev.filter(p => (Date.now() - p.spawnTime) < PARTICLE_LIFETIME_MS));
  });
  
  if (!streakTexture || (!isAnyBoosting && particles.length === 0)) {
    return null; 
  }

  return (
    <group name="WindscreenBoostEffectContainer" renderOrder={1000}> 
      {particles.map(p => (
        <WindscreenParticle key={p.id} particleId={p.id} texture={p.texture} viewport={p.viewport} />
      ))}
    </group>
  );
}
