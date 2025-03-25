import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayerController } from '../PlayerController';
import { useStore } from '../store';
import * as THREE from 'three';
import { render, act } from '@testing-library/react';
import { Controls } from '../../App';

// Mock canvas and context for lottie.js
const originalCreateElement = document.createElement;
document.createElement = function(tagName) {
  if (tagName === 'canvas') {
    const canvas = originalCreateElement.call(document, tagName);
    canvas.getContext = function() {
      return {
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8Array([]) })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => []),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        fillText: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        strokeRect: vi.fn(),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn()
        })),
        createPattern: vi.fn(() => ({})),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn()
        })),
        bezierCurveTo: vi.fn(),
        drawFocusIfNeeded: vi.fn(),
        clip: vi.fn(),
        ellipse: vi.fn(),
        isPointInPath: vi.fn(),
        isPointInStroke: vi.fn(),
        quadraticCurveTo: vi.fn(),
        rect: vi.fn(),
        setLineDash: vi.fn(),
        getLineDash: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        createConicGradient: vi.fn(),
        reset: vi.fn(),
        roundRect: vi.fn(),
        fillStyle: '#000',
        strokeStyle: '#000',
        lineWidth: 1,
        globalAlpha: 1,
        font: '10px sans-serif',
        globalCompositeOperation: 'source-over',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'low',
        lineCap: 'butt',
        lineDashOffset: 0,
        lineJoin: 'miter',
        miterLimit: 10,
        shadowBlur: 0,
        shadowColor: 'rgba(0, 0, 0, 0)',
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        textAlign: 'start',
        textBaseline: 'alphabetic',
        direction: 'ltr'
      };
    };
    return canvas;
  }
  return originalCreateElement.call(document, tagName);
};

// Mock dependencies
vi.mock('@react-three/drei', () => {
  const useGLTFMock = vi.fn().mockReturnValue({
    scene: {
      clone: vi.fn().mockReturnValue({
        traverse: vi.fn(),
        children: []
      })
    },
    nodes: {},
    materials: {},
    animations: []
  });
  
  // Add preload as a static method
  useGLTFMock.preload = vi.fn();
  
  return {
    useKeyboardControls: vi.fn().mockImplementation((callback) => {
      // By default, no controls are pressed
      return callback ? callback({
        [Controls.up]: false,
        [Controls.down]: false,
        [Controls.left]: false,
        [Controls.right]: false,
        [Controls.jump]: false,
        [Controls.shoot]: false,
        [Controls.reset]: false,
        [Controls.escape]: false,
      }) : false;
    }),
    PerspectiveCamera: vi.fn().mockImplementation(() => null),
    PositionalAudio: vi.fn().mockImplementation(({ url, ...props }) => (
      <audio data-testid={`audio-${url}`} {...props} />
    )),
    Cylinder: vi.fn().mockImplementation(() => null),
    useGLTF: useGLTFMock
  };
});

vi.mock('three', async () => {
  const actualThree = await vi.importActual('three');
  return {
    ...actualThree,
    Vector3: vi.fn().mockImplementation((x, y, z) => ({
      x: x || 0,
      y: y || 0,
      z: z || 0,
      normalize: vi.fn().mockReturnThis(),
      set: vi.fn(),
      copy: vi.fn(),
      add: vi.fn(),
      sub: vi.fn(),
      multiplyScalar: vi.fn(),
      length: vi.fn().mockReturnValue(1),
      distanceTo: vi.fn().mockReturnValue(10),
    })),
    Raycaster: vi.fn().mockImplementation(() => ({
      set: vi.fn(),
      intersectObjects: vi.fn().mockReturnValue([]),
    })),
  };
});

vi.mock('@react-three/rapier', () => ({
  RigidBody: vi.fn().mockImplementation(({ children, ...props }) => (
    <div data-testid="rigid-body" {...props}>
      {children}
    </div>
  )),
  BallCollider: vi.fn().mockImplementation(() => null),
  useRapier: vi.fn().mockReturnValue({
    rapier: {},
    world: {
      createRayCastVehicleController: vi.fn().mockReturnValue({
        addWheel: vi.fn(),
        setEngine: vi.fn(),
        setWheelAxle: vi.fn(),
        setWheelForwardDirection: vi.fn(),
        updateVehicle: vi.fn(),
      }),
    },
  }),
  vec3: vi.fn().mockImplementation((x, y, z) => ({
    x: x || 0,
    y: y || 0,
    z: z || 0,
    set: vi.fn(),
  })),
}));

vi.mock('../store');

vi.mock('../models/characters/Mario_kart', () => ({
  Mario: vi.fn().mockImplementation(({ scale, position, ...props }) => (
    <div data-testid="mario-model" {...props} />
  )),
}));

vi.mock('../Particles/drifts/DriftParticlesLeft', () => ({
  DriftParticlesLeft: vi.fn().mockImplementation(() => null),
}));

vi.mock('../Particles/drifts/DriftParticlesRight', () => ({
  DriftParticlesRight: vi.fn().mockImplementation(() => null),
}));

vi.mock('../Particles/drifts/PointParticle', () => ({
  PointParticle: vi.fn().mockImplementation(() => null),
}));

vi.mock('../Particles/smoke/SmokeParticles', () => ({
  SmokeParticles: vi.fn().mockImplementation(() => null),
}));

vi.mock('../Particles/hits/HitParticles', () => ({
  HitParticles: vi.fn().mockImplementation(() => null),
}));

vi.mock('../Particles/coins/CoinParticles', () => ({
  CoinParticles: vi.fn().mockImplementation(() => null),
}));

vi.mock('../Particles/items/ItemParticles', () => ({
  ItemParticles: vi.fn().mockImplementation(() => null),
}));

vi.mock('../ShaderMaterials/FakeGlow/FakeGlowMaterial', () => ({
  default: vi.fn().mockImplementation(() => null),
}));

// Mock the lottie-web module
vi.mock('lottie-web', () => ({
  default: {
    loadAnimation: vi.fn().mockReturnValue({
      pause: vi.fn(),
      play: vi.fn(),
      stop: vi.fn(),
      destroy: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setSpeed: vi.fn()
    }),
    destroy: vi.fn(),
    setQuality: vi.fn()
  }
}));

// Mock other related modules if necessary
vi.mock('bodymovin', () => ({
  default: {
    loadAnimation: vi.fn(),
    destroy: vi.fn(),
    setQuality: vi.fn()
  }
}));

// Skip lottie tests by mocking the lottie module path directly
vi.mock('src/libs/lottie.js', () => ({
  default: {
    loadAnimation: vi.fn(),
    destroy: vi.fn(),
    setQuality: vi.fn()
  }
}), { virtual: true });

describe('PlayerController', () => {
  // Setup mocks
  const useFrameMock = vi.fn();
  const bodyCurrentRef = { current: { position: { set: vi.fn() }, rotation: { y: 0 } } };
  const kartCurrentRef = { current: { rotation: { y: 0 } } };
  const camCurrentRef = { current: { position: { x: 0, y: 0, z: 0 } } };
  const mockPlayer = { id: 'player1' };
  const mockSetNetworkBananas = vi.fn();
  const mockSetNetworkShells = vi.fn();
  const mockNetworkBananas = [];
  const mockNetworkShells = [];
  
  vi.mock('@react-three/fiber', () => ({
    useFrame: (callback) => {
      useFrameMock.mockImplementation(callback);
    },
    useThree: vi.fn().mockReturnValue({
      camera: { position: { x: 0, y: 0, z: 0 } },
    }),
    extend: vi.fn(),
  }));
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset refs
    bodyCurrentRef.current = { 
      position: { set: vi.fn() },
      rotation: { y: 0 },
      addForce: vi.fn(),
      addTorque: vi.fn(),
      setLinvel: vi.fn(),
      setAngvel: vi.fn()
    };
    
    kartCurrentRef.current = { rotation: { y: 0 } };
    camCurrentRef.current = { 
      position: { x: 0, y: 0, z: 0 },
      lookAt: vi.fn()
    };
    
    // Setup store
    useStore.mockReturnValue({
      actions: {
        addParticle1: vi.fn(),
        addParticle2: vi.fn(),
        removeParticle1: vi.fn(),
        removeParticle2: vi.fn(),
        setBodyPosition: vi.fn(),
        setBodyRotation: vi.fn(),
        setShouldSlowDown: vi.fn(),
        useItem: vi.fn(),
        addBanana: vi.fn(),
        addShell: vi.fn(),
        addSkid: vi.fn(),
        addCoins: vi.fn(),
        looseCoins: vi.fn(),
        setGameStarted: vi.fn(),
        setIsDrifting: vi.fn(),
      },
      shouldSlowDown: false,
      item: "banana",
      bananas: [],
      coins: 5,
      id: 'player1',
      controls: 'mouseKeyboard',
    });
    
    // Mock refs via useRef
    vi.mock('react', async () => {
      const actual = await vi.importActual('react');
      return {
        ...actual,
        useRef: (initialValue) => {
          if (initialValue === 0) return { current: 0 };
          if (initialValue === false) return { current: false };
          if (initialValue === null) {
            // For different refs
            if (!bodyCurrentRef._used) {
              bodyCurrentRef._used = true;
              return bodyCurrentRef;
            }
            if (!kartCurrentRef._used) {
              kartCurrentRef._used = true;
              return kartCurrentRef;
            }
            if (!camCurrentRef._used) {
              camCurrentRef._used = true;
              return camCurrentRef;
            }
          }
          return { current: initialValue };
        }
      };
    });
  });

  // Now write some gaming-focused test cases
  it('should correctly handle acceleration when pressing the up key', () => {
    // Setup - Mock that the up key is pressed
    const { useKeyboardControls } = require('@react-three/drei');
    useKeyboardControls.mockImplementation((callback) => {
      return callback({
        [Controls.up]: true,
        [Controls.down]: false,
        [Controls.left]: false,
        [Controls.right]: false,
        [Controls.jump]: false,
        [Controls.shoot]: false,
        [Controls.reset]: false,
        [Controls.escape]: false,
      });
    });
    
    // Render the component
    render(
      <PlayerController
        player={mockPlayer}
        userPlayer={true}
        setNetworkBananas={mockSetNetworkBananas}
        setNetworkShells={mockSetNetworkShells}
        networkBananas={mockNetworkBananas}
        networkShells={mockNetworkShells}
      />
    );
    
    // Simulate a frame update with forward acceleration
    act(() => {
      // Call the useFrame callback with mock state and delta
      useFrameMock({ 
        pointer: { x: 0, y: 0 },
        clock: { getElapsedTime: () => 1000 },
      }, 0.016);
    });
    
    // Verify that the kart is accelerating forward
    expect(bodyCurrentRef.current.setLinvel).toHaveBeenCalled();
  });
  
  it('should handle drifting mechanics when jump key is pressed while turning', () => {
    // Setup - Mock that the jump key and left/right is pressed
    const { useKeyboardControls } = require('@react-three/drei');
    useKeyboardControls.mockImplementation((callback) => {
      return callback({
        [Controls.up]: true,
        [Controls.down]: false,
        [Controls.left]: true, // Turning left
        [Controls.right]: false,
        [Controls.jump]: true, // Space bar for drifting
        [Controls.shoot]: false,
        [Controls.reset]: false,
        [Controls.escape]: false,
      });
    });
    
    // Setup initial movement state so we're not starting from 0 speed
    const speedRef = { current: 15 }; // Above minimum drift speed
    vi.mock('react', async () => {
      const actual = await vi.importActual('react');
      return {
        ...actual,
        useRef: (initialValue) => {
          if (initialValue === 0 && !speedRef._used) {
            speedRef._used = true;
            return speedRef;
          }
          if (initialValue === false) return { current: false };
          if (initialValue === null) {
            // For different refs
            if (!bodyCurrentRef._used) {
              bodyCurrentRef._used = true;
              return bodyCurrentRef;
            }
            if (!kartCurrentRef._used) {
              kartCurrentRef._used = true;
              return kartCurrentRef;
            }
            if (!camCurrentRef._used) {
              camCurrentRef._used = true;
              return camCurrentRef;
            }
          }
          return { current: initialValue };
        }
      };
    });
    
    render(
      <PlayerController
        player={mockPlayer}
        userPlayer={true}
        setNetworkBananas={mockSetNetworkBananas}
        setNetworkShells={mockSetNetworkShells}
        networkBananas={mockNetworkBananas}
        networkShells={mockNetworkShells}
      />
    );
    
    // Simulate frame updates to initiate a drift
    act(() => {
      useFrameMock({ 
        pointer: { x: -0.5, y: 0 }, // Turn left with mouse
        clock: { getElapsedTime: () => 1000 },
      }, 0.016);
    });
    
    // Should call setIsDrifting with true when entering a drift
    expect(useStore().actions.setIsDrifting).toHaveBeenCalledWith(true);
  });
  
  it('should use an item when shoot key is pressed', () => {
    // Setup - Mock that the shoot key is pressed
    const { useKeyboardControls } = require('@react-three/drei');
    useKeyboardControls.mockImplementation((callback) => {
      return callback({
        [Controls.up]: false,
        [Controls.down]: false,
        [Controls.left]: false,
        [Controls.right]: false,
        [Controls.jump]: false,
        [Controls.shoot]: true, // E key to use item
        [Controls.reset]: false,
        [Controls.escape]: false,
      });
    });
    
    render(
      <PlayerController
        player={mockPlayer}
        userPlayer={true}
        setNetworkBananas={mockSetNetworkBananas}
        setNetworkShells={mockSetNetworkShells}
        networkBananas={mockNetworkBananas}
        networkShells={mockNetworkShells}
      />
    );
    
    act(() => {
      useFrameMock({ 
        pointer: { x: 0, y: 0 },
        clock: { getElapsedTime: () => 1000 },
      }, 0.016);
    });
    
    // Banana should be added since our mock store has "banana" as the current item
    expect(useStore().actions.addBanana).toHaveBeenCalled();
    // Item should be used
    expect(useStore().actions.useItem).toHaveBeenCalled();
  });
  
  it('should reset position when reset key is pressed', () => {
    // Setup - Mock that the reset key is pressed
    const { useKeyboardControls } = require('@react-three/drei');
    useKeyboardControls.mockImplementation((callback) => {
      return callback({
        [Controls.up]: false,
        [Controls.down]: false,
        [Controls.left]: false,
        [Controls.right]: false,
        [Controls.jump]: false,
        [Controls.shoot]: false,
        [Controls.reset]: true, // R key to reset
        [Controls.escape]: false,
      });
    });
    
    render(
      <PlayerController
        player={mockPlayer}
        userPlayer={true}
        setNetworkBananas={mockSetNetworkBananas}
        setNetworkShells={mockSetNetworkShells}
        networkBananas={mockNetworkBananas}
        networkShells={mockNetworkShells}
      />
    );
    
    act(() => {
      useFrameMock({ 
        pointer: { x: 0, y: 0 },
        clock: { getElapsedTime: () => 1000 },
      }, 0.016);
    });
    
    // Position should be reset
    expect(bodyCurrentRef.current.setLinvel).toHaveBeenCalled();
    expect(bodyCurrentRef.current.position.set).toHaveBeenCalled();
  });
  
  it('should slow down when passing over a banana', () => {
    // Mock the store to return that we should slow down
    useStore.mockReturnValue({
      actions: {
        addParticle1: vi.fn(),
        addParticle2: vi.fn(),
        removeParticle1: vi.fn(),
        removeParticle2: vi.fn(),
        setBodyPosition: vi.fn(),
        setBodyRotation: vi.fn(),
        setShouldSlowDown: vi.fn(),
        useItem: vi.fn(),
        addBanana: vi.fn(),
        addShell: vi.fn(),
        addSkid: vi.fn(),
        addCoins: vi.fn(),
        looseCoins: vi.fn(),
        setGameStarted: vi.fn(),
        setIsDrifting: vi.fn(),
      },
      shouldSlowDown: true, // Player hit a banana
      item: "banana",
      bananas: [],
      coins: 5,
      id: 'player1',
      controls: 'mouseKeyboard',
    });
    
    // Setup some initial speed
    const speedRef = { current: 20 };
    vi.mock('react', async () => {
      const actual = await vi.importActual('react');
      return {
        ...actual,
        useRef: (initialValue) => {
          if (initialValue === 0 && !speedRef._used) {
            speedRef._used = true;
            return speedRef;
          }
          if (initialValue === false) return { current: false };
          if (initialValue === null) {
            // For different refs
            if (!bodyCurrentRef._used) {
              bodyCurrentRef._used = true;
              return bodyCurrentRef;
            }
            if (!kartCurrentRef._used) {
              kartCurrentRef._used = true;
              return kartCurrentRef;
            }
            if (!camCurrentRef._used) {
              camCurrentRef._used = true;
              return camCurrentRef;
            }
          }
          return { current: initialValue };
        }
      };
    });
    
    render(
      <PlayerController
        player={mockPlayer}
        userPlayer={true}
        setNetworkBananas={mockSetNetworkBananas}
        setNetworkShells={mockSetNetworkShells}
        networkBananas={mockNetworkBananas}
        networkShells={mockNetworkShells}
      />
    );
    
    act(() => {
      useFrameMock({ 
        pointer: { x: 0, y: 0 },
        clock: { getElapsedTime: () => 1000 },
      }, 0.016);
    });
    
    // Speed should be drastically reduced after hitting a banana
    expect(speedRef.current).toBeLessThan(20);
  });
}); 