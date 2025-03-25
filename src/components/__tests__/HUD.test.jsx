import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HUD } from '../../HUD';
import { useStore } from '../store';

// Mock the store
vi.mock('../store', () => ({
  useStore: vi.fn()
}));

describe('HUD Component', () => {
  beforeEach(() => {
    // Reset and setup the mocked store before each test
    const mockActions = {
      setJoystickX: vi.fn(),
      setDriftButton: vi.fn(),
      setItemButton: vi.fn(),
      setMenuButton: vi.fn()
    };

    useStore.mockReturnValue({
      gameStarted: true,
      controls: 'touch',
      item: 'banana',
      actions: mockActions
    });
  });

  it('should render the HUD when game is started', () => {
    const { container } = render(<HUD />);
    
    // The overlay container should be present
    expect(container.querySelector('.overlay')).toBeInTheDocument();
  });

  it('should display item image when an item is available', () => {
    render(<HUD />);
    
    // Find the image element
    const itemImage = screen.getByAltText('item');
    
    // Test if the image has the correct source for the banana item
    expect(itemImage.src).toContain('banana');
  });

  it('should only show touch controls when control type is touch', () => {
    render(<HUD />);
    
    // Check for touch-specific controls
    expect(screen.getByText('drift')).toBeInTheDocument();
    expect(screen.getByText('item')).toBeInTheDocument();
    expect(screen.getByText('menu')).toBeInTheDocument();
  });

  it('should not show touch controls with non-touch control type', () => {
    // Override the mocked return value for this specific test
    useStore.mockReturnValue({
      gameStarted: true,
      controls: 'keyboard', // Not touch
      item: 'banana',
      actions: {
        setJoystickX: vi.fn(),
        setDriftButton: vi.fn(),
        setItemButton: vi.fn(),
        setMenuButton: vi.fn()
      }
    });
    
    render(<HUD />);
    
    // Touch controls should not be present
    expect(screen.queryByText('drift')).not.toBeInTheDocument();
    expect(screen.queryByText('item')).not.toBeInTheDocument();
    expect(screen.queryByText('menu')).not.toBeInTheDocument();
  });

  it('should call action functions when interacting with touch controls', () => {
    const mockActions = {
      setJoystickX: vi.fn(),
      setDriftButton: vi.fn(),
      setItemButton: vi.fn(),
      setMenuButton: vi.fn()
    };
    
    useStore.mockReturnValue({
      gameStarted: true,
      controls: 'touch',
      item: 'banana',
      actions: mockActions
    });
    
    render(<HUD />);
    
    // Test drift button press
    const driftButton = screen.getByText('drift');
    fireEvent.mouseDown(driftButton);
    expect(mockActions.setDriftButton).toHaveBeenCalledWith(true);
    
    fireEvent.mouseUp(driftButton);
    expect(mockActions.setDriftButton).toHaveBeenCalledWith(false);
    
    // Test item button press
    const itemButton = screen.getByText('item');
    fireEvent.mouseDown(itemButton);
    expect(mockActions.setItemButton).toHaveBeenCalledWith(true);
    
    fireEvent.mouseUp(itemButton);
    expect(mockActions.setItemButton).toHaveBeenCalledWith(false);
    
    // Test menu button press
    const menuButton = screen.getByText('menu');
    fireEvent.mouseDown(menuButton);
    expect(mockActions.setMenuButton).toHaveBeenCalledWith(true);
    
    fireEvent.mouseUp(menuButton);
    expect(mockActions.setMenuButton).toHaveBeenCalledWith(false);
  });

  it('should display the current speed from the store', () => {
    // Set up the store with a specific speed value
    useStore.mockReturnValue({
      gameStarted: true,
      controls: 'keyboard',
      item: 'banana',
      currentSpeed: 88,
      actions: {
        setJoystickX: vi.fn(),
        setDriftButton: vi.fn(),
        setItemButton: vi.fn(),
        setMenuButton: vi.fn()
      }
    });
    
    render(<HUD />);
    
    // Find the speed value and unit elements
    const speedValue = screen.getByText('88');
    const speedUnit = screen.getByText('KM/H');
    
    // Verify the speed is displayed correctly
    expect(speedValue).toBeInTheDocument();
    expect(speedUnit).toBeInTheDocument();
  });
}); 