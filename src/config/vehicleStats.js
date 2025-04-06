// Vehicle stats configuration file that maps character IDs to vehicle performance characteristics
// These values will be used to modify the physics and handling of the kart based on character selection

export const vehicleStats = {
  // Doge - Balanced character
  doge: {
    maxSpeedMultiplier: 1.0,      // Base max speed (30 * 1.0 = 30)
    accelerationMultiplier: 1.0,   // Base acceleration (0.1 * 1.0 = 0.1)
    handlingMultiplier: 1.0,       // Base handling/steering (0.01 * 1.0 = 0.01)
    weightMultiplier: 1.0,         // Base weight (affects collisions and physics)
    driftPowerMultiplier: 1.0,     // Base drift power accumulation
    jumpForceMultiplier: 1.0,      // Base jump height
    description: "Balanced stats for steady performance",
  },
  
  // Grumpy Cat - Handling focused, good acceleration, but lower speed and weight
  grumpy: {
    maxSpeedMultiplier: 0.9,       // Slower top speed
    accelerationMultiplier: 1.3,   // Better acceleration
    handlingMultiplier: 1.2,       // Better steering control
    weightMultiplier: 0.8,         // Lighter weight (more affected by collisions)
    driftPowerMultiplier: 1.2,     // Faster drift power accumulation
    jumpForceMultiplier: 1.1,      // Higher jumps
    description: "Great acceleration and handling with quick drifts, but lower top speed",
  },
  
  // Pepe - Speed focused, but poor handling and acceleration
  pepe: {
    maxSpeedMultiplier: 1.2,       // Higher top speed
    accelerationMultiplier: 0.8,   // Slower acceleration
    handlingMultiplier: 0.9,       // Worse steering control
    weightMultiplier: 0.9,         // Average weight
    driftPowerMultiplier: 0.9,     // Slower drift power accumulation
    jumpForceMultiplier: 0.9,      // Lower jumps
    description: "High top speed, but slower to accelerate and harder to handle",
  },
  
  // Wojak - Technical character with excellent handling but low speed
  wojak: {
    maxSpeedMultiplier: 0.85,      // Lower top speed
    accelerationMultiplier: 1.2,   // Good acceleration
    handlingMultiplier: 1.4,       // Excellent steering control
    weightMultiplier: 0.7,         // Very light weight
    driftPowerMultiplier: 1.3,     // Much faster drift power accumulation
    jumpForceMultiplier: 1.2,      // Higher jumps
    description: "Expert handling and drifting for technical racers, but lower top speed",
  },
  
  // Cheems - All-rounder with slight handling advantage
  cheems: {
    maxSpeedMultiplier: 1.0,       // Average top speed
    accelerationMultiplier: 1.0,   // Average acceleration
    handlingMultiplier: 1.15,      // Better than average steering
    weightMultiplier: 0.9,         // Slightly below average weight
    driftPowerMultiplier: 1.15,    // Slightly better drift power accumulation
    jumpForceMultiplier: 1.0,      // Average jumps
    description: "Well-rounded with a slight edge in handling and drifting",
  },
  
  // Chadoge - Heavy weight, high speed, but poor acceleration and handling
  chadoge: {
    maxSpeedMultiplier: 1.25,      // Much higher top speed
    accelerationMultiplier: 0.7,   // Much slower acceleration
    handlingMultiplier: 0.7,       // Much worse steering control
    weightMultiplier: 1.5,         // Very heavy weight (pushes other karts in collisions)
    driftPowerMultiplier: 0.8,     // Slower drift power accumulation
    jumpForceMultiplier: 0.8,      // Lower jumps
    description: "Heavyweight with excellent top speed, but slow to accelerate and harder to control",
  }
};

// Helper function to get stats for a character
export const getVehicleStatsForCharacter = (characterId) => {
  // Return the stats for the specified character, or default to doge if not found
  return vehicleStats[characterId] || vehicleStats.doge;
}; 