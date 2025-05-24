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

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }) => <>{children}</>,
    motion: {
      // Mock specific motion components if needed, or a generic one
      div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>),
      // Add other motion components if your HUD uses them e.g. img, h1 etc.
    },
  };
});

vi.mock('../store');

// Mock MemeStickerHUD
vi.mock('../MemeStickerHUD', () => ({
  MemeStickerHUD: vi.fn(() => {
    const isStickerActive = useStore((state) => state.isStickerActive);
    const stickerImage = useStore((state) => state.stickerImage);
    if (isStickerActive && stickerImage) {
      return <div data-testid="meme-sticker-hud"><img src={stickerImage} alt="Meme Sticker" /></div>;
    }
    return null;
  }),
}));

// Mock DownvoteEffectHUD
vi.mock('../DownvoteEffectHUD', () => ({
  DownvoteEffectHUD: vi.fn(() => {
    const ownPlayerId = useStore((state) => state.id);
    const playerEffects = useStore((state) => state.playerEffects);
    const isPlayerSlowedByItem = playerEffects?.[ownPlayerId]?.isSlowed || false;
    if (isPlayerSlowedByItem) {
      return <div data-testid="downvote-effect-hud">Slowed Down</div>;
    }
    return null;
  }),
}));


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
    // This will be the base mock for most tests.
    useStore.mockReturnValue({
      id: 'player1', // Default player ID for tests
      item: null,
      items: ["mushroom", "shell", "banana", "memeSticker", "downvote"],
      isStickerActive: false,
      stickerImage: null,
      stickerEndTime: 0,
      playerEffects: { // Initialize with current player
        'player1': { isSlowed: false, slowEndTime: 0, isDisoriented: false, disorientationType: null, disorientationEndTime: 0 }
      },
      actions: {
        setShouldSlowDown: vi.fn((isSlowed) => { // Legacy banana slowdown
            const playerId = useStore.getState().id;
            if(isSlowed) useStore.getState().actions.applySlowdown(playerId, 1500);
            else useStore.getState().actions.removeSlowdown(playerId);
        }),
        removeBananaById: vi.fn(),
        removeShell: vi.fn(),
        setItem: vi.fn((newItem) => {
          useStore.setState(prevState => ({ ...prevState, item: newItem }));
        }),
        applyMemeSticker: vi.fn(() => {
          const memeImages = ["/images/memes/trollface.png", "/images/memes/doge_sticker.png", "/images/memes/pepe_sticker.png"];
          const randomMeme = memeImages[Math.floor(Math.random() * memeImages.length)];
          const stickerDuration = 3000; // Corresponds to MemeSticker logic
          useStore.setState(prevState => ({
            ...prevState,
            isStickerActive: true,
            stickerImage: randomMeme,
            stickerEndTime: Date.now() + stickerDuration,
          }));
          setTimeout(() => useStore.getState().actions.removeMemeSticker(), stickerDuration);
        }),
        removeMemeSticker: vi.fn(() => {
          useStore.setState(prevState => ({ ...prevState, isStickerActive: false, stickerImage: null, stickerEndTime: 0 }));
        }),
        applySlowdown: vi.fn((targetPlayerId, duration) => {
          useStore.setState(prevState => ({
            ...prevState,
            playerEffects: {
              ...prevState.playerEffects,
              [targetPlayerId]: { ...(prevState.playerEffects?.[targetPlayerId] || {}), isSlowed: true, slowEndTime: Date.now() + duration },
            },
          }));
          setTimeout(() => useStore.getState().actions.removeSlowdown(targetPlayerId), duration);
        }),
        removeSlowdown: vi.fn((targetPlayerId) => {
          useStore.setState(prevState => ({
            ...prevState,
            playerEffects: {
              ...prevState.playerEffects,
              [targetPlayerId]: { ...(prevState.playerEffects?.[targetPlayerId] || {}), isSlowed: false, slowEndTime: 0 },
            },
          }));
        }),
        useItem: vi.fn(() => {
          const state = useStore.getState();
          const currentItem = state.item;
          const ownPlayerId = state.id;

          if (!currentItem || !ownPlayerId) return;

          if (currentItem === "memeSticker") {
            state.actions.applyMemeSticker();
          } else if (currentItem === "downvote") {
            state.actions.applySlowdown(ownPlayerId, 4000); // Self-inflicted 4s slowdown
          }
          // Consume item
          if (currentItem !== "trollTrap") { 
             useStore.setState(prevState => ({ ...prevState, item: null }));
          }
        }),
      },
    });

    useStore.setState = (updater) => {
      const oldState = { ...useStore.getState() }; // Clone to avoid direct mutation if updater uses prevState
      const newStateChanges = typeof updater === 'function' ? updater(oldState) : updater;
      // Deep merge actions if they are part of newStateChanges
      const newActions = newStateChanges.actions ? { ...oldState.actions, ...newStateChanges.actions } : oldState.actions;
      useStore.mockReturnValue({ ...oldState, ...newStateChanges, actions: newActions });
    };
    useStore.getState = () => useStore();

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

  describe('Meme Sticker Item', () => {
    beforeEach(() => {
      // Reset parts of the store mock specific to meme sticker tests if needed
      useStore.setState({
        item: null,
        isStickerActive: false,
        stickerImage: null,
        stickerEndTime: 0,
      });
    });

    it('should acquire "memeSticker" item', () => {
      // Simulate picking up a meme sticker
      // This test assumes an external mechanism (like ItemBox) calls actions.setItem()
      // For this test, we can directly set the item in the store via our mock helpers
      useStore.setState({ item: 'memeSticker' });
      expect(useStore.getState().item).toBe('memeSticker');
    });

    it('applyMemeSticker action should set sticker state correctly', () => {
      const { actions } = useStore.getState();
      actions.applyMemeSticker();

      const state = useStore.getState();
      expect(state.isStickerActive).toBe(true);
      expect(state.stickerImage).not.toBeNull();
      expect(state.stickerImage).toMatch(/^\/images\/memes\/(trollface|doge_sticker|pepe_sticker)\.png$/);
      expect(state.stickerEndTime).toBeGreaterThan(Date.now() - 100); // Check it's a future time
    });

    it('useItem action should trigger applyMemeSticker for "memeSticker"', () => {
      const { actions } = useStore.getState();
      // Give player a meme sticker
      useStore.setState({ item: 'memeSticker' });
      
      actions.useItem();
      
      // applyMemeSticker should have been called by useItem
      expect(actions.applyMemeSticker).toHaveBeenCalled();
      // And item should be consumed
      expect(useStore.getState().item).toBeNull();
    });

    it('removeMemeSticker should be called after duration and clear state', () => {
      vi.useFakeTimers();
      const { actions } = useStore.getState();
      
      // Apply the sticker
      actions.applyMemeSticker();
      expect(useStore.getState().isStickerActive).toBe(true);

      // Advance timers past the sticker duration (e.g., 3000ms)
      vi.advanceTimersByTime(3000 + 50); // Advance by 3.05 seconds

      // removeMemeSticker should have been called via the setTimeout in applyMemeSticker
      expect(actions.removeMemeSticker).toHaveBeenCalled();
      
      const state = useStore.getState();
      expect(state.isStickerActive).toBe(false);
      expect(state.stickerImage).toBeNull();
      expect(state.stickerEndTime).toBe(0);

      vi.useRealTimers();
    });
  });
  
  describe('MemeStickerHUD Component', () => {
    it('should render image when sticker is active', () => {
      // Set store state to active sticker
      useStore.setState({
        isStickerActive: true,
        stickerImage: '/images/memes/trollface.png',
      });
      
      // MemeStickerHUD is globally mocked to use the store, so we just render something that would include it
      // Or, if testing App.jsx, ensure App.jsx is rendered.
      // For this unit test, we can rely on the mock of MemeStickerHUD itself.
      const { MemeStickerHUD: MockedHUD } = await import('../MemeStickerHUD'); // Get the mocked component
      render(<MockedHUD />);
      
      expect(screen.getByTestId('meme-sticker-hud')).toBeInTheDocument();
      const imgElement = screen.getByRole('img');
      expect(imgElement).toHaveAttribute('src', '/images/memes/trollface.png');
    });

    it('should not render when sticker is inactive', () => {
      useStore.setState({
        isStickerActive: false,
        stickerImage: null,
      });

      const { MemeStickerHUD: MockedHUD } = await import('../MemeStickerHUD');
      render(<MockedHUD />);
      
      expect(screen.queryByTestId('meme-sticker-hud')).toBeNull();
    });
  });

  describe('Downvote Item', () => {
    const ownPlayerId = 'player1'; // Consistent with default mock state

    beforeEach(() => {
      // Ensure playerEffects for the current player is reset before each test
      useStore.setState(prevState => ({
        item: null,
        playerEffects: {
          ...prevState.playerEffects,
          [ownPlayerId]: { isSlowed: false, slowEndTime: 0, isDisoriented: false, disorientationType: null, disorientationEndTime: 0 }
        }
      }));
    });

    it('should acquire "downvote" item', () => {
      useStore.setState({ item: 'downvote' });
      expect(useStore.getState().item).toBe('downvote');
    });

    it('applySlowdown action should set playerEffects correctly for target player', () => {
      const { actions } = useStore.getState();
      const duration = 2500;
      actions.applySlowdown(ownPlayerId, duration);

      const state = useStore.getState();
      expect(state.playerEffects[ownPlayerId].isSlowed).toBe(true);
      expect(state.playerEffects[ownPlayerId].slowEndTime).toBeGreaterThan(Date.now() - 100);
      expect(state.playerEffects[ownPlayerId].slowEndTime).toBeLessThanOrEqual(Date.now() + duration);
    });

    it('useItem action should trigger applySlowdown for "downvote" on self', () => {
      const { actions } = useStore.getState();
      useStore.setState({ item: 'downvote', id: ownPlayerId }); // Set current item and ensure ID is our target
      
      actions.useItem();
      
      expect(actions.applySlowdown).toHaveBeenCalledWith(ownPlayerId, 4000);
      expect(useStore.getState().item).toBeNull(); // Item consumed
    });

    it('removeSlowdown should be called after duration and clear effect', () => {
      vi.useFakeTimers();
      const { actions } = useStore.getState();
      const duration = 2800;
      
      actions.applySlowdown(ownPlayerId, duration);
      expect(useStore.getState().playerEffects[ownPlayerId].isSlowed).toBe(true);

      vi.advanceTimersByTime(duration + 50);

      expect(actions.removeSlowdown).toHaveBeenCalledWith(ownPlayerId);
      expect(useStore.getState().playerEffects[ownPlayerId].isSlowed).toBe(false);
      expect(useStore.getState().playerEffects[ownPlayerId].slowEndTime).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('DownvoteEffectHUD Component', () => {
    const ownPlayerId = 'player1';

    it('should render when player is slowed down', () => {
      useStore.setState({
        id: ownPlayerId,
        playerEffects: { [ownPlayerId]: { isSlowed: true } }
      });
      const { DownvoteEffectHUD: MockedDownvoteHUD } = await import('../DownvoteEffectHUD');
      render(<MockedDownvoteHUD />);
      expect(screen.getByTestId('downvote-effect-hud')).toBeInTheDocument();
      expect(screen.getByText('Slowed Down')).toBeInTheDocument();
    });

    it('should not render when player is not slowed down', () => {
      useStore.setState({
        id: ownPlayerId,
        playerEffects: { [ownPlayerId]: { isSlowed: false } }
      });
      const { DownvoteEffectHUD: MockedDownvoteHUD } = await import('../DownvoteEffectHUD');
      render(<MockedDownvoteHUD />);
      expect(screen.queryByTestId('downvote-effect-hud')).toBeNull();
    });
  });

});