import React, { useRef, useEffect, Suspense } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useStore } from '../../store'; 
import * as THREE from 'three';
import { Box, useTexture } from '@react-three/drei';

const FallbackMaterial = () => <meshStandardMaterial color="darkviolet" roughness={0.5} metalness={0.2} />; // A distinct fallback color

const TexturedTrapBoxMaterial = React.memo(() => {
  let texture;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    texture = useTexture('/images/memes/trollface.png', (loadedTexture) => {
      if (loadedTexture) {
        const tex = Array.isArray(loadedTexture) ? loadedTexture[0] : loadedTexture;
        if (tex instanceof THREE.Texture) {
          tex.wrapS = THREE.RepeatWrapping; 
          tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(1, 1); // Ensure texture covers the box face
        }
      }
    });
  } catch (e) {
    console.warn("TrollTrap: trollface.png texture could not be loaded. Using fallback.", e);
    texture = null; 
  }

  let materialMap = null;
  if (texture instanceof THREE.Texture) {
    materialMap = texture;
  } else if (Array.isArray(texture) && texture.length > 0 && texture[0] instanceof THREE.Texture) {
    materialMap = texture[0];
  }

  if (materialMap) {
    return <meshStandardMaterial 
            map={materialMap} 
            roughness={0.6} 
            metalness={0.15} // Adjusted properties slightly
            side={THREE.FrontSide}
           />;
  }
  return <FallbackMaterial />; 
});


export function TrollTrap(props) {
  const { id, position, rotation } = props;
  const { actions } = useStore();
  const trapRef = useRef();

  useEffect(() => {
    if (trapRef.current) {
      trapRef.current.name = `trollTrap-${id}`; 
    }
  }, [id]);

  const handleCollision = (payload) => {
    const otherRigidBody = payload.colliderObject?.parent;
    const victimPlayerId = otherRigidBody?.name; 

    if (victimPlayerId && (victimPlayerId.startsWith("player-") || victimPlayerId === "local-player")) {
      console.log(`Troll Trap ${id} triggered by player: ${victimPlayerId}`);
      
      const disorientationTypes = ['invertedControls', 'screenShake'];
      const randomType = disorientationTypes[Math.floor(Math.random() * disorientationTypes.length)];
      
      actions.applyDisorientation(victimPlayerId, randomType, 3000); // 3 seconds of disorientation
      actions.removeTrollTrapById(id);
    } else if (victimPlayerId === "player") { 
      const localId = useStore.getState().id;
      if (localId) {
        console.log(`Troll Trap ${id} triggered by local player (name="player", resolved to id): ${localId}`);
        const disorientationTypes = ['invertedControls', 'screenShake'];
        const randomType = disorientationTypes[Math.floor(Math.random() * disorientationTypes.length)];
        actions.applyDisorientation(localId, randomType, 3000);
        actions.removeTrollTrapById(id);
      }
    }
  };

  return (
    <RigidBody
      ref={trapRef}
      type="fixed" 
      position={position}
      rotation={rotation || [0,0,0]} 
      colliders={false} 
      name={`trollTrapBody-${id}`} 
    >
      <CuboidCollider
        args={[0.35, 0.05, 0.35]} // Half-extents. Actual size: 0.7m x 0.1m x 0.7m (very flat trap)
        sensor 
        onIntersectionEnter={handleCollision}
        name={`trollTrapSensor-${id}`} 
      />
      <Box args={[0.7, 0.1, 0.7]} castShadow receiveShadow> {/* Visual representation */}
        <Suspense fallback={<FallbackMaterial />}>
          <TexturedTrapBoxMaterial />
        </Suspense>
      </Box>
    </RigidBody>
  );
}

if (typeof window !== 'undefined') { 
    useTexture.preload('/images/memes/trollface.png');
}
