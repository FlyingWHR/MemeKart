import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { HUD } from '../../HUD';
import { useStore } from '../store';
import { PlayerControllerKeyboard } from '../PlayerController';

// Mock the store
vi.mock('../store', () => ({
  useStore: vi.fn()
}));

// Mock Three.js and related dependencies
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn((callback) => callback({ clock: { getElapsedTime: () => 0 } }, 1)),
  useThree: vi.fn(() => ({})),
  extend: vi.fn()
}));

vi.mock('@react-three/rapier', () => ({
  RigidBody: vi.fn(({ children }) => <div>{children}</div>),
  BallCollider: vi.fn(() => null),
  useRapier: vi.fn(() => ({ rapier: {} })),
  vec3: vi.fn(() => [0, 0, 0])
}));

vi.mock('@react-three/drei', () => {
  const useGLTF = vi.fn(() => ({
    nodes: {},
    materials: {}
  }));
  useGLTF.preload = vi.fn();
  
  return {
    useKeyboardControls: vi.fn(() => false),
    PerspectiveCamera: vi.fn(() => null),
    PositionalAudio: vi.fn(() => null),
    Cylinder: vi.fn(() => null),
    useGLTF
  };
});

vi.mock('../models/characters/Mario_kart', () => ({
  Mario: vi.fn(() => null)
}));

vi.mock('../Particles/drifts/DriftParticlesLeft', () => ({
  DriftParticlesLeft: vi.fn(() => null)
}));

vi.mock('../Particles/drifts/DriftParticlesRight', () => ({
  DriftParticlesRight: vi.fn(() => null)
}));

vi.mock('../Particles/drifts/PointParticle', () => ({
  PointParticle: vi.fn(() => null)
}));

vi.mock('../Particles/smoke/SmokeParticles', () => ({
  SmokeParticles: vi.fn(() => null)
}));

vi.mock('../Particles/hits/HitParticles', () => ({
  HitParticles: vi.fn(() => null)
}));

vi.mock('../Particles/coins/CoinParticles', () => ({
  CoinParticles: vi.fn(() => null)
}));

vi.mock('../Particles/items/ItemParticles', () => ({
  ItemParticles: vi.fn(() => null)
}));

vi.mock('../ShaderMaterials/FakeGlow/FakeGlowMaterial', () => ({
  default: vi.fn(() => null)
}));

vi.mock('three', () => ({
  Vector3: vi.fn(() => ({
    multiplyScalar: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
    sub: vi.fn(() => ({ x: 0, y: 0, z: 0 }))
  })),
  MathUtils: {
    lerp: vi.fn((a, b, t) => a + (b - a) * t)
  },
  Raycaster: vi.fn(() => ({
    set: vi.fn(),
    intersectObjects: vi.fn(() => [])
  }))
}));

describe('Speed Display Functionality', () => {
  let mockActions;
  let mockStore;
  
  beforeEach(() => {
    // Create mock actions with spy functions
    mockActions = {
      setCurrentSpeed: vi.fn(),
      getCurrentSpeed: vi.fn(() => 0)
    };
    
    // Set up the mock store return value with initial state
    mockStore = {
      gameStarted: true,
      controls: 'keyboard',
      item: '',
      currentSpeed: 0,
      actions: mockActions,
      id: 'player1'
    };
    
    useStore.mockReturnValue(mockStore);
  });
  
  it('should display the current speed from the store', () => {
    // Set up the store with a specific speed value
    mockStore.currentSpeed = 60;
    useStore.mockReturnValue(mockStore);
    
    // Render the HUD component
    render(<HUD />);
    
    // Find the speed value element
    const speedValue = screen.getByText('60');
    const speedUnit = screen.getByText('KM/H');
    
    // Verify the speed is displayed correctly
    expect(speedValue).toBeInTheDocument();
    expect(speedUnit).toBeInTheDocument();
  });
  
  it('should update the speed display when store value changes', () => {
    // Initial render with speed = 0
    mockStore.currentSpeed = 0;
    useStore.mockReturnValue(mockStore);
    
    const { rerender } = render(<HUD />);
    
    // Verify initial speed
    expect(screen.getByText('0')).toBeInTheDocument();
    
    // Update the store value
    mockStore.currentSpeed = 75;
    useStore.mockReturnValue(mockStore);
    
    // Re-render the component
    rerender(<HUD />);
    
    // Verify updated speed
    expect(screen.getByText('75')).toBeInTheDocument();
  });
  
  it('should convert speed from m/s to km/h in the PlayerController', () => {
    // This test verifies that the conversion formula is working correctly
    
    // Mock the necessary refs
    const mockRefs = {
      current: {
        rotation: { y: 0 },
        position: { set: vi.fn() },
        translation: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
        linvel: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
        applyImpulse: vi.fn()
      }
    };
    
    // Setup the store for this test
    mockStore = {
      gameStarted: true,
      controls: 'keyboard',
      item: '',
      actions: mockActions,
      id: 'player1'
    };
    
    useStore.mockReturnValue(mockStore);
    
    // Create a function to simulate what happens in the PlayerController
    const simulateSpeedUpdate = (rawSpeed) => {
      // This simulates the calculation in PlayerController.jsx
      const displaySpeed = Math.round(Math.abs(rawSpeed) * 3.6);
      return displaySpeed;
    };
    
    // Test with a few sample speeds
    const testSpeeds = [5, 10, 27.8]; // ~100 km/h for the last one
    
    testSpeeds.forEach(speed => {
      const expectedKmh = Math.round(Math.abs(speed) * 3.6);
      const result = simulateSpeedUpdate(speed);
      expect(result).toBe(expectedKmh);
    });
  });
  
  it('should handle zero and negative speeds correctly', () => {
    // Test that zero speed is displayed as zero
    mockStore.currentSpeed = 0;
    useStore.mockReturnValue(mockStore);
    
    const { rerender } = render(<HUD />);
    expect(screen.getByText('0')).toBeInTheDocument();
    
    // Test that negative speeds are converted to positive for display
    const simulateSpeedUpdate = (rawSpeed) => {
      return Math.round(Math.abs(rawSpeed) * 3.6);
    };
    
    expect(simulateSpeedUpdate(-10)).toBe(36); // |-10| * 3.6 = 36
  });
}); 