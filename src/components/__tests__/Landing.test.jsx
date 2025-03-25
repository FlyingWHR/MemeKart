import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Landing } from '../../Landing';
import { useStore } from '../store';

// Mock the store
vi.mock('../store', () => ({
  useStore: vi.fn()
}));

// Mock gsap
vi.mock('gsap', () => ({
  default: {
    timeline: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      to: vi.fn().mockReturnThis()
    })
  }
}));

describe('Landing Component', () => {
  beforeEach(() => {
    // Reset and setup the mocked store before each test
    const mockActions = {
      setControls: vi.fn(),
      setGameStarted: vi.fn(),
      setSelectedCharacter: vi.fn()
    };

    useStore.mockReturnValue({
      gameStarted: false,
      selectedCharacter: 'doge',
      characters: [
        { id: "doge", name: "Doge", speed: 3, acceleration: 3, handling: 3, weight: 3, image: "/images/characters/doge.png" },
        { id: "grumpy", name: "Grumpy Cat", speed: 2, acceleration: 5, handling: 4, weight: 1, image: "/images/characters/grumpy.png" }
      ],
      actions: mockActions
    });
  });

  it('should render the landing page when game is not started', () => {
    render(<Landing />);

    // The logo and start button should be present
    expect(screen.getByAltText('MemeKart logo')).toBeInTheDocument();
    expect(screen.getByText('PRESS ENTER TO START')).toBeInTheDocument();
  });

  it('should navigate to character selection when pressing Enter on landing page', () => {
    render(<Landing />);
    
    // First screen should be visible
    expect(screen.getByText('PRESS ENTER TO START')).toBeInTheDocument();
    
    // Press Enter
    fireEvent.keyDown(document.body, { key: 'Enter' });
    
    // Character selection should now be visible
    expect(screen.getByText('Choose Your Meme')).toBeInTheDocument();
  });

  it('should display character selection screen when navigating to it', () => {
    const { rerender } = render(<Landing />);
    
    // Click the start button to navigate to character selection
    fireEvent.click(screen.getByText('PRESS ENTER TO START'));
    
    rerender(<Landing />);
    
    // Character selection elements should be present
    expect(screen.getByText('Choose Your Meme')).toBeInTheDocument();
    expect(screen.getByText('Doge')).toBeInTheDocument();
    expect(screen.getByText('Grumpy Cat')).toBeInTheDocument();
    expect(screen.getAllByText('Speed')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Accel')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Handling')[0]).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByText('Select')).toBeInTheDocument();
  });

  it('should navigate back from character selection to landing page', () => {
    const { rerender } = render(<Landing />);
    
    // Navigate to character selection
    fireEvent.click(screen.getByText('PRESS ENTER TO START'));
    rerender(<Landing />);
    
    // Click back button
    fireEvent.click(screen.getByText('Back'));
    rerender(<Landing />);
    
    // Should be back at the landing page
    expect(screen.getByText('PRESS ENTER TO START')).toBeInTheDocument();
  });

  it('should navigate to controls screen after selecting a character', () => {
    const mockActions = {
      setControls: vi.fn(),
      setGameStarted: vi.fn(),
      setSelectedCharacter: vi.fn()
    };

    useStore.mockReturnValue({
      gameStarted: false,
      selectedCharacter: 'doge',
      characters: [
        { id: "doge", name: "Doge", speed: 3, acceleration: 3, handling: 3, weight: 3, image: "/images/characters/doge.png" },
        { id: "grumpy", name: "Grumpy Cat", speed: 2, acceleration: 5, handling: 4, weight: 1, image: "/images/characters/grumpy.png" }
      ],
      actions: mockActions
    });
    
    const { rerender } = render(<Landing />);
    
    // Navigate to character selection
    fireEvent.click(screen.getByText('PRESS ENTER TO START'));
    rerender(<Landing />);
    
    // Select a character and confirm
    fireEvent.click(screen.getByText('Grumpy Cat'));
    fireEvent.click(screen.getByText('Select'));
    rerender(<Landing />);
    
    // Should now see the controls screen
    expect(screen.getByText('KEYBOARD CONTROLS')).toBeInTheDocument();
    expect(screen.getByText('PRESS ENTER TO START RACE')).toBeInTheDocument();
  });

  it('should display keyboard controls on the controls screen', () => {
    const mockActions = {
      setControls: vi.fn(),
      setGameStarted: vi.fn(),
      setSelectedCharacter: vi.fn()
    };

    useStore.mockReturnValue({
      gameStarted: false,
      selectedCharacter: 'doge',
      characters: [
        { id: "doge", name: "Doge", speed: 3, acceleration: 3, handling: 3, weight: 3, image: "/images/characters/doge.png" }
      ],
      actions: mockActions
    });
    
    const { rerender } = render(<Landing />);
    
    // Navigate to character selection and then to controls
    fireEvent.click(screen.getByText('PRESS ENTER TO START'));
    rerender(<Landing />);
    fireEvent.click(screen.getByText('Select'));
    rerender(<Landing />);
    
    // The keyboard controls section should be present
    expect(screen.getByText('KEYBOARD CONTROLS')).toBeInTheDocument();

    // Check for key elements
    expect(screen.getByText('W')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('↑')).toBeInTheDocument();
    expect(screen.getByText('←')).toBeInTheDocument();
    expect(screen.getByText('↓')).toBeInTheDocument();
    expect(screen.getByText('→')).toBeInTheDocument();
    expect(screen.getByText('Space')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();

    // Check for text content
    expect(screen.getByText('Accelerate')).toBeInTheDocument();
    expect(screen.getByText('Turn Left')).toBeInTheDocument();
    expect(screen.getByText('Brake/Reverse')).toBeInTheDocument();
    expect(screen.getByText('Turn Right')).toBeInTheDocument();
    expect(screen.getByText('Drift/Jump')).toBeInTheDocument();
    expect(screen.getByText('Use Item')).toBeInTheDocument();
    expect(screen.getByText('Reset Position')).toBeInTheDocument();
    expect(screen.getByText('Pause Menu')).toBeInTheDocument();
  });

  it('should start the game when clicking the start race button', () => {
    const mockActions = {
      setControls: vi.fn(),
      setGameStarted: vi.fn(),
      setSelectedCharacter: vi.fn()
    };

    useStore.mockReturnValue({
      gameStarted: false,
      selectedCharacter: 'doge',
      characters: [
        { id: "doge", name: "Doge", speed: 3, acceleration: 3, handling: 3, weight: 3, image: "/images/characters/doge.png" }
      ],
      actions: mockActions
    });
    
    const { rerender } = render(<Landing />);
    
    // Navigate to character selection and then to controls
    fireEvent.click(screen.getByText('PRESS ENTER TO START'));
    rerender(<Landing />);
    fireEvent.click(screen.getByText('Select'));
    rerender(<Landing />);
    
    // Click the start race button
    fireEvent.click(screen.getByText('PRESS ENTER TO START RACE'));
    
    // Should have called the actions to start the game
    expect(mockActions.setControls).toHaveBeenCalledWith('keyboard');
    expect(mockActions.setGameStarted).toHaveBeenCalledWith(true);
  });

  it('should not render when game is started', () => {
    // Arrange: Set up with gameStarted true
    useStore.mockReturnValue({
      gameStarted: true,
      actions: {
        setControls: vi.fn(),
        setGameStarted: vi.fn()
      }
    });

    const { container } = render(<Landing />);

    // Assert: The component should render nothing
    expect(container).toBeEmptyDOMElement();
  });
}); 