import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../App';
import { HUD } from '../../HUD';
import { Landing } from '../../Landing';
import { useStore } from '../store';
import userEvent from '@testing-library/user-event';

// Mock the component dependencies
vi.mock('../store');
vi.mock('playroomkit');
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: vi.fn(),
  useLoader: vi.fn().mockReturnValue({})
}));

// Mock the Experience component properly
vi.mock('../components/Experience', () => ({
  Experience: () => <div data-testid="experience">Experience Component</div>
}));

// More specific mock for App
vi.mock('../../App', () => ({
  default: () => <div data-testid="app">App Component</div>,
  Controls: {
    up: 'up',
    down: 'down',
    left: 'left',
    right: 'right',
    boost: 'boost',
    shoot: 'shoot',
    slow: 'slow',
    reset: 'reset',
    escape: 'escape'
  }
}));

describe('Game Integration Tests', () => {
  const renderApp = () => {
    return render(
      <>
        <App />
        <HUD />
        <Landing />
      </>
    );
  };
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Mock the store's default behavior
    const mockActions = {
      addPlayer: vi.fn(),
      setId: vi.fn(),
      removePlayer: vi.fn(),
      setControls: vi.fn(),
      setGameStarted: vi.fn(),
      setJoystickX: vi.fn(),
      setDriftButton: vi.fn(),
      setItemButton: vi.fn(),
      setMenuButton: vi.fn()
    };
    
    useStore.mockImplementation(() => ({
      gameStarted: false,
      controls: '',
      item: '',
      actions: mockActions,
      players: []
    }));
  });
  
  it('renders the landing page when the game is not started', () => {
    render(<Landing />);
    
    // The landing page should be visible
    expect(screen.getByText('PRESS ENTER TO CONTINUE')).toBeInTheDocument();
  });
  
  it('shows controls appropriate to the selected input method', () => {
    // Test with touch controls
    useStore.mockImplementation(() => ({
      gameStarted: true,
      controls: 'touch',
      item: 'banana',
      actions: {
        setJoystickX: vi.fn(),
        setDriftButton: vi.fn(),
        setItemButton: vi.fn(),
        setMenuButton: vi.fn()
      },
      players: [{ id: 'player1' }]
    }));
    
    render(<HUD />);
    
    // Touch-specific buttons should be visible
    expect(screen.getByText('drift')).toBeInTheDocument();
    expect(screen.getByText('item')).toBeInTheDocument();
    expect(screen.getByText('menu')).toBeInTheDocument();
    
    // Item should be displayed
    expect(screen.getByAltText('item')).toHaveAttribute('src', './images/banana.webp');
  });
}); 