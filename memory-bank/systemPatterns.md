# MemeKart System Patterns

## Core Systems Architecture

### 1. Player Control System
- Base Controller Class
  - Common physics and input handling
  - Ground detection
  - Collision response
  - Speed management

- Specialized Controllers
  1. Keyboard Controller
     - WASD/Arrow key input
     - Space for drift
     - Key mapping system
  
  2. Gamepad Controller
     - Analog stick support
     - Button mapping
     - Vibration feedback
  
  3. Touch Controller
     - Virtual joystick
     - Touch buttons
     - Mobile optimization

### 2. Physics System
- Rapier Integration
  - Rigid body physics
  - Collision detection
  - Ground raycasting
  - Force application

- Custom Physics
  - Drift mechanics
  - Speed calculations
  - Wall bouncing
  - Item trajectories

### 3. Drift System
- State Management
  ```javascript
  isDrifting: boolean
  driftDirection: number
  accumulatedDriftPower: number
  fireColor: color  // Visual indicator of drift power
  isPostBoost: boolean  // State after boost ends
  ```

- Drift Stages
  1. Initiation
     - Jump button + steering
     - Direction locking
     - Animation start
  
  2. Maintenance
     - Power accumulation based on drift duration and steering input
     - Visual flame effects (blue → orange → red progression)
     - Sound effects synchronized with flame colors
  
  3. Fire Thresholds
     ```javascript
     smallFireThreshold = 3;  // Blue-white flame (cooler)
     mediumFireThreshold = 16;  // Orange-yellow flame (medium heat)
     hotFireThreshold = 35;  // Red flame (hottest)
     ```
  
  4. Release
     - Boost application only if threshold reached
     - Higher boost duration based on accumulated power
     - Effect cleanup and state reset
  
  5. Boost Mechanics
     ```javascript
     maxBoostForce = 200;  // Maximum force during boost
     boostSpeed = 50;  // Maximum speed during boost (vs normal 30)
     ```
     - Force application in forward direction
     - Temporary speed limit increase
     - Camera pull-back effect
  
  6. Post-Boost Phase
     ```javascript
     isPostBoost = true;  // Enter post-boost state
     postBoostSpeedLimit = boostSpeed;  // Start at boost speed
     postBoostDecayRate = 10;  // Units per second decrease
     ```
     - Gradual speed limit reduction
     - Smooth deceleration to normal speed
     - Camera gradual return

### 4. Particle Systems Architecture

- Core Components
  1. PointParticle (src/components/Particles/drifts/PointParticle.jsx)
     ```javascript
     // Key properties
     position: Vector3  // Particle spawn position
     fireColor: hex     // Color based on drift power
     visible: boolean   // Visibility state
     size: number       // Current particle size
     opacity: number    // Current particle opacity
     ```
     - Size animation from 0.02 to 0.1 during drift
     - Opacity animation from 0.5 to 1.0 during drift
     - Visibility tied to parent scale (drift intensity)
     - Used for both point and star textures

  2. Directional Particles (Particles1,2,3,4.jsx)
     ```javascript
     // Key properties
     velocity: {x,y,z}  // Movement direction and speed
     gravity: number    // Downward force (-0.001 to -0.003)
     fireColor: hex     // Linked to drift power level
     scale: Vector3     // Controls size and proportions
     ```
     - Physics-based movement with gravity
     - Direction varies by particle type (left/right)
     - Skip rendering when fireColor is white (0xffffff)
     - Reset position when touching ground

  3. Smoke Particles
     ```javascript
     // Key properties
     leftDrift: boolean  // Left drift state
     rightDrift: boolean // Right drift state
     opacity: number     // Fades over time
     size: number        // Shrinks over time
     ```
     - Direction based on drift direction
     - Gradually fades out (opacity -= 0.01)
     - Gradually shrinks (size -= 0.1)
     - Reset position when reaching boundaries

- Container System
  1. DriftParticlesLeft and DriftParticlesRight
     - Group multiple instances of directional particles
     - Scale all particles based on drift intensity
     - Apply fire color to all contained particles
     - Positioned at wheel locations

  2. SmokeParticles
     - Groups SmokeParticle instances
     - Controlled by driftLeft and driftRight states
     - Uses different textures for visual variety
     - Delayed initialization (200ms)

- Integration with Controller
  ```javascript
  // Controller Pattern
  <DriftParticlesLeft fireColor={fireColor} scale={scale} />
  <DriftParticlesRight fireColor={fireColor} scale={scale} />
  <SmokeParticles 
    driftRight={driftRight.current}
    driftLeft={driftLeft.current}
  />
  <PointParticle
    position={[-0.6, 0.05, 0.5]}
    png="./particles/circle.png"
    fireColor={fireColor}
  />
  ```

- Particle Animation Flow
  1. Drift Initiation
     - Set scale value based on oscillation
     - Initialize particles with small size
  
  2. During Drift
     - Particles grow and increase opacity
     - Directional movement based on type
     - Color changes based on drift power
  
  3. Drift End
     - Size and opacity set to 0
     - Visibility disabled
     - Scale reset to 0

### 5. Character System
- Stats Management
  ```javascript
  {
    speed: number,
    acceleration: number,
    handling: number,
    weight: number
  }
  ```

- Stat Application
  - Speed multipliers
  - Handling adjustment
  - Physics modification
  - Drift characteristics

### 6. Item System
- Item Types
  1. Banana
     - Placement logic
     - Collision detection
     - Effect application
  
  2. Shell
     - Trajectory calculation
     - Bounce physics
     - Target tracking

### 7. Audio System
- Sound Categories
  1. Engine
     - Speed-based pitch
     - Load variation
     - Continuous playback
  
  2. Effects
     - Drift sounds
     - Collision impacts
     - Item usage
     - Boost activation

### 8. Camera System
- Behaviors
  1. Following
     - Smooth interpolation
     - Obstacle avoidance
     - Height adjustment
  
  2. Effects
     - Drift angle
     - Speed influence
     - Collision shake
     - Boost pull

## State Management Pattern
```javascript
// Zustand Store Structure
{
  // Game State
  gameStarted: boolean,
  currentLap: number,
  raceTime: number,
  isRaceFinished: boolean,

  // Player State
  currentSpeed: number,
  isDrifting: boolean,
  hasItem: boolean,
  position: Vector3,

  // Character State
  selectedCharacter: string,
  characterStats: CharacterStats,

  // Race State
  checkpoints: Checkpoint[],
  items: Item[],
  particles: Particle[]
}
```

## Component Patterns
```jsx
// Base Component Structure
const GameComponent = () => {
  // State Management
  const store = useStore()
  
  // Physics References
  const body = useRef()
  
  // Update Loop
  useFrame((state, delta) => {
    // Physics Update
    // State Update
    // Visual Update
  })
  
  // Event Handlers
  const handleCollision = () => {
    // Collision Response
  }
  
  return (
    // Component JSX
  )
}
```