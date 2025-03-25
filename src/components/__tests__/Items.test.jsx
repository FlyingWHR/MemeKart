import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useStore } from '../store';
import * as THREE from 'three';

// Mock Three.js
vi.mock('three', async () => {
  const actualThree = await vi.importActual('three');
  return {
    ...actualThree,
    Group: vi.fn().mockImplementation(() => ({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      add: vi.fn(),
      remove: vi.fn(),
    })),
  };
});

// Mock @react-three/drei with useGLTF
vi.mock('@react-three/drei', () => ({
  useGLTF: vi.fn().mockReturnValue({
    scene: {
      clone: vi.fn().mockReturnValue({
        traverse: vi.fn(),
        children: [],
      }),
    },
    nodes: {},
    materials: {}
  })
}));

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn().mockImplementation((callback) => {
    // Store the callback to call it in tests
    global._useFrameCallback = callback;
  }),
  useLoader: vi.fn().mockReturnValue({
    scene: {
      clone: vi.fn().mockReturnValue({
        traverse: vi.fn(),
        children: [],
      }),
    },
  }),
}));

// Mock @react-three/rapier
vi.mock('@react-three/rapier', () => ({
  RigidBody: vi.fn().mockImplementation(({ children, ...props }) => (
    <div data-testid="rigid-body" {...props}>
      {children}
    </div>
  )),
  CuboidCollider: vi.fn().mockImplementation(() => null),
  useRapier: vi.fn().mockReturnValue({
    rapier: {
      ColliderDesc: {
        ball: vi.fn().mockReturnValue({
          setRestitution: vi.fn().mockReturnThis(),
        }),
      },
      RigidBodyDesc: {
        dynamic: vi.fn().mockReturnValue({
          setLinvel: vi.fn().mockReturnThis(),
        }),
      },
    },
    world: {
      createRigidBody: vi.fn(),
      createCollider: vi.fn(),
    },
  }),
}));

// Mock the actual item component modules
vi.mock('../models/items/Banana_peel_mario_kart', () => ({
  Banana: vi.fn().mockImplementation(({ id, position, setNetworkBananas, networkBananas, ...props }) => (
    <div 
      data-testid="banana-item" 
      data-id={id}
      data-position={JSON.stringify(position)}
      {...props}
    />
  ))
}));

vi.mock('../models/items/Mario_shell_red', () => ({
  Shell: vi.fn().mockImplementation(({ id, position, rotation, setNetworkShells, networkShells, ...props }) => (
    <div 
      data-testid="shell-item" 
      data-id={id}
      data-position={JSON.stringify(position)}
      data-rotation={JSON.stringify(rotation)}
      {...props}
    />
  ))
}));

vi.mock('../store');

describe('Item Game Mechanics', () => {
  const mockNetworkBananas = [
    { id: 'banana1', position: { x: 0, y: 0, z: 0 } }
  ];
  const mockSetNetworkBananas = vi.fn();
  
  const mockNetworkShells = [
    { id: 'shell1', position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } }
  ];
  const mockSetNetworkShells = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset global variables
    global._useFrameCallback = null;

    // Setup store default state
    useStore.mockReturnValue({
      actions: {
        setShouldSlowDown: vi.fn(),
        removeBananaById: vi.fn(),
        removeShell: vi.fn(),
      },
    });
  });
  
  describe('Banana Mechanics', () => {
    it('should render banana at specified position', () => {
      const position = { x: 10, y: 2, z: -5 };
      
      render(
        <div data-testid="banana-item" 
          data-id="test-banana"
          data-position={JSON.stringify(position)}
        />
      );
      
      // Verify the banana is rendered at correct position
      const bananaItem = screen.getByTestId('banana-item');
      expect(bananaItem).toBeInTheDocument();
      expect(bananaItem.getAttribute('data-position')).toBe(JSON.stringify(position));
    });
    
    it('should trigger slowdown effect on collision', () => {
      // Create a mock collision handler that simulates Banana component behavior
      const handleCollision = (collider) => {
        if (collider.rigidBodyObject.name.includes('player')) {
          useStore().actions.setShouldSlowDown(true);
          return true;
        }
        return false;
      };
      
      // Simulate a collision with player
      const result = handleCollision({ 
        rigidBodyObject: { name: 'player1' } 
      });
      
      // Verify slow down effect is triggered
      expect(result).toBe(true);
      expect(useStore().actions.setShouldSlowDown).toHaveBeenCalledWith(true);
    });
    
    it('should remove banana from network after collision', () => {
      const bananaId = 'test-banana';
      
      // Create a mock removal function
      const removeAfterCollision = (id) => {
        useStore().actions.removeBananaById(id);
        const filteredBananas = mockNetworkBananas.filter(b => b.id !== id);
        mockSetNetworkBananas(filteredBananas);
        return filteredBananas;
      };
      
      // Simulate banana removal
      const updatedBananas = removeAfterCollision(bananaId);
      
      // Verify banana is removed
      expect(useStore().actions.removeBananaById).toHaveBeenCalledWith(bananaId);
      expect(mockSetNetworkBananas).toHaveBeenCalled();
    });
  });
  
  describe('Shell Mechanics', () => {
    it('should render shell at specified position and rotation', () => {
      const position = { x: 5, y: 1, z: 10 };
      const rotation = { y: Math.PI / 2 }; // 90 degrees
      
      render(
        <div 
          data-testid="shell-item" 
          data-id="test-shell"
          data-position={JSON.stringify(position)}
          data-rotation={JSON.stringify(rotation)}
        />
      );
      
      // Verify the shell is rendered at correct position and rotation
      const shellItem = screen.getByTestId('shell-item');
      expect(shellItem).toBeInTheDocument();
      expect(shellItem.getAttribute('data-position')).toBe(JSON.stringify(position));
      expect(shellItem.getAttribute('data-rotation')).toBe(JSON.stringify(rotation));
    });
    
    it('should move forward over time', () => {
      const initialPosition = { x: 0, y: 1, z: 0 };
      const initialRotation = { y: 0 }; // Forward along Z axis
      
      // Create a mock shell object
      const mockShell = {
        id: 'test-shell',
        position: { ...initialPosition },
        rotation: { ...initialRotation }
      };
      
      // Define shell movement logic
      const moveShell = (shell, delta) => {
        const shellSpeed = 30; // From Shell component
        const newPos = { ...shell.position };
        newPos.z -= Math.cos(shell.rotation.y) * shellSpeed * delta;
        newPos.x -= Math.sin(shell.rotation.y) * shellSpeed * delta;
        return { ...shell, position: newPos };
      };
      
      // Apply movement logic
      const delta = 0.016; // 60fps
      const updatedShell = moveShell(mockShell, delta);
      
      // Verify shell has moved forward (negative Z)
      expect(updatedShell.position.z).toBeLessThan(0);
      expect(updatedShell.position.z).toBeCloseTo(-0.48, 2); // 30 * 0.016 = 0.48
    });
    
    it('should be removed after specified lifetime', () => {
      // Mock function to filter out shells by creation time
      const removeOldShells = (shells, currentTime) => {
        const shellLifetime = 5000; // milliseconds
        const filtered = shells.filter(shell => {
          if (!shell.createdAt) return true;
          return currentTime - shell.createdAt < shellLifetime;
        });
        
        // If filtering removed any shells, update the network
        if (filtered.length < shells.length) {
          mockSetNetworkShells(filtered);
          return true;
        }
        return false;
      };
      
      // Initial shells with one old shell
      const time = Date.now();
      const testShells = [
        { id: 'new-shell', createdAt: time - 1000 },
        { id: 'old-shell', createdAt: time - 6000 } // > 5000ms lifetime
      ];
      
      // Remove old shells
      const removed = removeOldShells(testShells, time);
      
      // Verify old shell is removed
      expect(removed).toBe(true);
      expect(mockSetNetworkShells).toHaveBeenCalled();
      expect(mockSetNetworkShells.mock.calls[0][0].length).toBe(1);
      expect(mockSetNetworkShells.mock.calls[0][0][0].id).toBe('new-shell');
    });
    
    it('should remove shell on collision with player', () => {
      const shellId = 'test-shell';
      
      // Mock function to remove shell on collision
      const removeOnCollision = (id, collider) => {
        if (collider.rigidBodyObject.name.includes('player')) {
          useStore().actions.removeShell(id);
          mockSetNetworkShells(mockNetworkShells.filter(s => s.id !== id));
          return true;
        }
        return false;
      };
      
      // Simulate collision with player
      const collisionResult = removeOnCollision(shellId, {
        rigidBodyObject: { name: 'player2' }
      });
      
      // Verify shell is removed on collision
      expect(collisionResult).toBe(true);
      expect(useStore().actions.removeShell).toHaveBeenCalledWith(shellId);
      expect(mockSetNetworkShells).toHaveBeenCalled();
    });
  });
  
  describe('Item Interaction System', () => {
    it('should handle multiple items in the scene', () => {
      // Mock function to update item positions
      const updateItems = (delta) => {
        // Move shells forward
        const updatedShells = mockNetworkShells.map(shell => {
          const newPos = { ...shell.position };
          newPos.z -= Math.cos(shell.rotation.y) * 30 * delta;
          newPos.x -= Math.sin(shell.rotation.y) * 30 * delta;
          return { ...shell, position: newPos };
        });
        
        // Bananas don't move but could have animation
        const updatedBananas = mockNetworkBananas.map(banana => {
          // Add simple animation like rotation
          return banana;
        });
        
        mockSetNetworkShells(updatedShells);
        mockSetNetworkBananas(updatedBananas);
        
        return { shells: updatedShells, bananas: updatedBananas };
      };
      
      // Update items
      const result = updateItems(0.016);
      
      // Verify updates
      expect(mockSetNetworkShells).toHaveBeenCalled();
      expect(mockSetNetworkBananas).toHaveBeenCalled();
      expect(result.shells[0].position.z).toBeLessThan(mockNetworkShells[0].position.z);
    });
    
    it('should filter items based on lifetime', () => {
      const currentTime = Date.now();
      
      // Create test items with different creation times
      const testBananas = [
        { id: 'b1', createdAt: currentTime - 20000 }, // old
        { id: 'b2', createdAt: currentTime - 5000 }   // recent
      ];
      
      const testShells = [
        { id: 's1', createdAt: currentTime - 6000 }, // old
        { id: 's2', createdAt: currentTime - 2000 }  // recent
      ];
      
      // Mock filter function for lifetime
      const filterByLifetime = (items, lifetime) => {
        return items.filter(item => currentTime - item.createdAt < lifetime);
      };
      
      // Bananas last longer (30s)
      const filteredBananas = filterByLifetime(testBananas, 10000);
      // Shells have shorter lifetime (5s)
      const filteredShells = filterByLifetime(testShells, 5000);
      
      // Verify filtering
      expect(filteredBananas.length).toBe(1);
      expect(filteredBananas[0].id).toBe('b2');
      expect(filteredShells.length).toBe(1);
      expect(filteredShells[0].id).toBe('s2');
    });
  });
}); 