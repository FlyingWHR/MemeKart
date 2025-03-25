import React from 'react';
import { LapCheckpoint } from './LapCheckpoint';

export const CheckpointSystem = () => {
  // Define all checkpoints for the track
  const checkpoints = [
    { id: 'cp1', position: [8, 2, -110], size: [20, 5, 1] },
    { id: 'cp2', position: [-50, 2, -130], size: [1, 5, 20], rotation: [0, Math.PI/2, 0] },
    { id: 'cp3', position: [-100, 2, -80], size: [20, 5, 1] },
    { id: 'cp4', position: [-120, 2, -20], size: [1, 5, 20], rotation: [0, Math.PI/2, 0] },
    { id: 'cp5', position: [-70, 2, 30], size: [20, 5, 1] },
    { id: 'cp6', position: [0, 2, 20], size: [1, 5, 20], rotation: [0, Math.PI/2, 0] },
    { id: 'cp7', position: [50, 2, -40], size: [20, 5, 1] },
  ];

  // Define the finish line position and size
  const finishLine = {
    id: 'finish',
    position: [8, 2, -119], // Position matches player spawn for testing
    size: [20, 5, 1],
    isFinishLine: true,
    // The finish line requires all checkpoints to be passed
    requiredCheckpoints: checkpoints.map(cp => cp.id)
  };

  return (
    <>
      {/* Render the regular checkpoints */}
      {checkpoints.map((checkpoint) => (
        <LapCheckpoint
          key={checkpoint.id}
          id={checkpoint.id}
          position={checkpoint.position}
          size={checkpoint.size}
          visible={true} // Set to false in production
        />
      ))}

      {/* Render the finish line */}
      <LapCheckpoint
        key={finishLine.id}
        id={finishLine.id}
        position={finishLine.position}
        size={finishLine.size}
        isFinishLine={finishLine.isFinishLine}
        requiredCheckpoints={finishLine.requiredCheckpoints}
        visible={true} // Set to false in production
      />
    </>
  );
}; 