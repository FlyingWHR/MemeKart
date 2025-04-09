# MemeKart Technical Context

## Technology Stack

### Core Technologies
1. React
   - Component-based UI
   - Virtual DOM rendering
   - Hook-based state management

2. Three.js / React Three Fiber
   - 3D rendering engine
   - Scene graph management
   - Material system
   - Shader support

3. Rapier Physics
   - Rigid body simulation
   - Collision detection
   - Physics constraints
   - Force application

4. Zustand
   - State management
   - Action dispatching
   - State persistence
   - Performance optimization

### Development Tools
1. Vite
   - Fast development server
   - Hot module replacement
   - Build optimization
   - Asset handling

2. TypeScript
   - Type safety
   - Code documentation
   - Development tooling
   - Error prevention

3. Testing Framework
   - Vitest
   - React Testing Library
   - Jest
   - Coverage reporting

## Performance Considerations

### Rendering Optimization
1. Three.js
   - Object pooling
   - Geometry instancing
   - Texture atlasing
   - LOD implementation

2. React
   - Component memoization
   - Render optimization
   - State batching
   - Effect cleanup

### Physics Optimization
1. Collision Detection
   - Broad phase optimization
   - Collision filtering
   - Resolution prioritization
   - Contact caching

2. Performance Scaling
   - Dynamic physics step
   - Distance-based updates
   - Simplified remote physics
   - Interpolation

## Browser Compatibility

### Minimum Requirements
- WebGL 2.0 support
- ES6+ JavaScript
- Gamepad API (optional)
- Touch events (mobile)
- Web Audio API

### Performance Targets
- 60 FPS on desktop
- 30 FPS on mobile
- <100ms input latency
- <50ms physics update

## Development Patterns

### Component Structure
```javascript
// Component Template
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import { useStore } from './store'

export const GameComponent = () => {
  // Refs & State
  const componentRef = useRef()
  const [localState, setLocalState] = useState()
  
  // Store Access
  const { gameState, actions } = useStore()
  
  // Update Loop
  useFrame((state, delta) => {
    // Physics
    // State Updates
    // Visual Updates
  })
  
  // Event Handlers
  const handleEvent = () => {
    // Event Logic
  }
  
  return (
    // Component Markup
  )
}
```

### State Management
```javascript
// Store Template
export const useStore = create((set, get) => ({
  // State
  gameState: {},
  playerState: {},
  
  // Actions
  actions: {
    updateGame: (data) => set(state => ({
      gameState: { ...state.gameState, ...data }
    })),
    updatePlayer: (data) => set(state => ({
      playerState: { ...state.playerState, ...data }
    }))
  }
}))
```

### Physics Integration
```javascript
// Physics Template
import { useRapier } from '@react-three/rapier'

export const PhysicsComponent = () => {
  const { world, rapier } = useRapier()
  
  // Physics Setup
  const setupPhysics = () => {
    // Collision Groups
    // Material Properties
    // Constraints
  }
  
  // Physics Update
  const updatePhysics = (delta) => {
    // Force Application
    // State Updates
    // Collision Handling
  }
}
``` 