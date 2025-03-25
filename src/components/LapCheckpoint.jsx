import React, { useRef, useState } from 'react';
import { useStore } from './store';
import { Box, useHelper } from '@react-three/drei';
import { BoxHelper } from 'three';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';

export const LapCheckpoint = ({ 
  position, 
  size = [10, 5, 1], 
  id, 
  isFinishLine = false, 
  requiredCheckpoints = [],
  visible = false
}) => {
  const checkpointRef = useRef();
  const { rapier, world } = useRapier();
  const { id: playerId, checkpoints, actions } = useStore();
  
  // Only show helper in development
  const [showHelper, setShowHelper] = useState(process.env.NODE_ENV === 'development' && visible);
  if (showHelper) {
    useHelper(checkpointRef, BoxHelper, 'red');
  }
  
  // Handle checkpoint and lap completion
  useFrame(() => {
    if (!checkpointRef.current) return;
    
    // Get player body
    const player = world.bodies.filter(body => body.rigidBody && body.rigidBody.userData?.name === 'player')[0];
    if (!player) return;
    
    // Create a ray query
    const playerPosition = player.translation();
    
    // Simple AABB collision check between player and checkpoint
    const checkpointBounds = {
      min: {
        x: position[0] - size[0]/2,
        y: position[1] - size[1]/2,
        z: position[2] - size[2]/2,
      },
      max: {
        x: position[0] + size[0]/2,
        y: position[1] + size[1]/2,
        z: position[2] + size[2]/2,
      },
    };

    // Player as a sphere
    const playerRadius = 0.5; // Assuming player is a sphere with radius 0.5

    // Check collision
    const isInside = (
      playerPosition.x + playerRadius > checkpointBounds.min.x &&
      playerPosition.x - playerRadius < checkpointBounds.max.x &&
      playerPosition.y + playerRadius > checkpointBounds.min.y &&
      playerPosition.y - playerRadius < checkpointBounds.max.y &&
      playerPosition.z + playerRadius > checkpointBounds.min.z &&
      playerPosition.z - playerRadius < checkpointBounds.max.z
    );

    if (isInside) {
      if (isFinishLine) {
        // Check if player has passed all required checkpoints for this lap
        const hasAllRequiredCheckpoints = requiredCheckpoints.every(cp => 
          checkpoints.includes(cp)
        );

        if (hasAllRequiredCheckpoints) {
          // Player has completed a lap
          actions.completeLap();
        }
      } else {
        // Regular checkpoint - record that player has passed it
        actions.passCheckpoint(id);
      }
    }
  });

  return (
    <Box 
      ref={checkpointRef} 
      position={position}
      args={size}
      material-color={isFinishLine ? 'red' : 'blue'}
      material-transparent={true}
      material-opacity={showHelper ? 0.2 : 0} // Invisible in production
    />
  );
}; 