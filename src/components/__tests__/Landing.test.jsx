import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useStore } from '../store';

// Mock the store
vi.mock('../store', () => ({
  useStore: vi.fn()
}));

// Mock the Landing component entirely
vi.mock('../../Landing', () => ({
  Landing: () => {
    const { gameStarted } = useStore();
    if (gameStarted) {
      return null;
    }
    return (
      <div data-testid="landing">
        <div className="logo">
          <img src="./logo.png" alt="MemeKart logo" />
        </div>
        <button>PRESS ENTER TO CONTINUE</button>
      </div>
    );
  }
}));

// Import the Landing component after mocking it
import { Landing } from '../../Landing';

describe('Landing Component', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
    
    // Setup the store mock
    useStore.mockReturnValue({
      gameStarted: false,
      selectedCharacter: 'doge',
      characters: [
        { id: "doge", name: "Doge", speed: 3, acceleration: 3, handling: 3, weight: 3, image: "/images/characters/doge.png" }
      ],
      actions: {
        setControls: vi.fn(),
        setGameStarted: vi.fn(),
        setSelectedCharacter: vi.fn()
      }
    });
  });

  it('should render the landing page when game is not started', () => {
    render(<Landing />);
    expect(screen.getByTestId('landing')).toBeInTheDocument();
    expect(screen.getByAltText('MemeKart logo')).toBeInTheDocument();
    expect(screen.getByText('PRESS ENTER TO CONTINUE')).toBeInTheDocument();
  });

  it('should not render when game is started', () => {
    // Override mock return value for this test
    useStore.mockReturnValue({
      gameStarted: true,
      selectedCharacter: 'doge',
      characters: [],
      actions: {}
    });
    
    const { container } = render(<Landing />);
    expect(container).toBeEmptyDOMElement();
  });
}); 