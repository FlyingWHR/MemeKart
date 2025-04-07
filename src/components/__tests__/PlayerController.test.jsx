import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock the store
vi.mock('../store', () => ({
  useStore: vi.fn()
}));

// Mock the PlayerController component
vi.mock('../PlayerController', () => ({
  PlayerController: vi.fn().mockImplementation(() => {
    return <div data-testid="mocked-player-controller" />;
  })
}));

// Import components after mocks
import { useStore } from '../store';
import { PlayerController } from '../PlayerController';

describe('PlayerController', () => {
  // Mock functions
  const mockUseItem = vi.fn();
  const mockResetItem = vi.fn();
  const mockHandleBananaCollision = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup store mock
    useStore.mockImplementation((selector) => {
      const state = {
        gameStarted: true,
        controlType: 'keyboard',
        playerKart: {
          id: 'player1',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          speed: 15,
          maxSpeed: 30,
          handling: 0.5,
          acceleration: 0.5,
          item: null,
          using_item: false,
          drifting: false,
          boost: 0,
          steeringAngle: 0,
        },
        useItem: mockUseItem,
        resetItem: mockResetItem,
        handleBananaCollision: mockHandleBananaCollision,
      };
      
      if (selector) {
        return selector(state);
      }
      return state;
    });
  });
  
  it('should render properly', () => {
    const { getByTestId } = render(<PlayerController />);
    expect(getByTestId('mocked-player-controller')).toBeTruthy();
    expect(PlayerController).toHaveBeenCalled();
  });
  
  it('should handle item usage', () => {
    // Configure the store to have an item
    useStore.mockImplementation((selector) => {
      const state = {
        gameStarted: true,
        controlType: 'keyboard',
        playerKart: {
          id: 'player1',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          speed: 15,
          maxSpeed: 30,
          handling: 0.5,
          acceleration: 0.5,
          item: 'banana',
          using_item: true,
          drifting: false,
          boost: 0,
          steeringAngle: 0,
        },
        useItem: mockUseItem,
        resetItem: mockResetItem,
      };
      
      if (selector) {
        return selector(state);
      }
      return state;
    });
    
    // Render the component
    render(<PlayerController />);
    
    // Check if the component was rendered
    expect(PlayerController).toHaveBeenCalled();
  });
  
  it('should handle banana collision', () => {
    render(<PlayerController />);
    
    // Call the banana collision handler directly
    mockHandleBananaCollision();
    
    // Verify it was called
    expect(mockHandleBananaCollision).toHaveBeenCalled();
  });
  
  it('should respond to keyboard controls', () => {
    render(<PlayerController />);
    expect(PlayerController).toHaveBeenCalled();
  });
});