import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { HUD } from '../HUD';
import { useStore } from '../components/store';

// Mock the store
jest.mock('../components/store', () => ({
  useStore: jest.fn()
}));

// Mock the audio elements
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(),
  pause: jest.fn(),
  currentTime: 0,
}));

describe('CountdownOverlay Component', () => {
  // Setup default store values before each test
  beforeEach(() => {
    useStore.mockReturnValue({
      gameStarted: true,
      countdownActive: true,
      actions: {
        endCountdown: jest.fn(),
        setDriftButton: jest.fn(),
        setItemButton: jest.fn(),
        setMenuButton: jest.fn(),
        setJoystickX: jest.fn()
      },
      item: '',
      controls: 'keyboard',
      currentSpeed: 80,
      currentLap: 1,
      totalLaps: 3,
      raceTime: 125.5,
      isRaceFinished: false,
      kartPlacedOnGround: true
    });
  });

  test('renders the countdown overlay when countdown is active', () => {
    render(<HUD />);
    
    // Check if traffic light is rendered
    expect(screen.getByTestId('traffic-light')).toBeInTheDocument();
    
    // Check if countdown number starts at 3
    expect(screen.getByTestId('countdown-number')).toHaveTextContent('3');
  });

  test('countdown transitions from 3 to GO!', async () => {
    jest.useFakeTimers();
    
    render(<HUD />);
    
    // Should start with 3
    expect(screen.getByTestId('countdown-number')).toHaveTextContent('3');
    
    // Advance timer to get to 2
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('countdown-number')).toHaveTextContent('2');
    
    // Advance timer to get to 1
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('countdown-number')).toHaveTextContent('1');
    
    // Advance timer to get to GO!
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('countdown-number')).toHaveTextContent('GO!');
    
    jest.useRealTimers();
  });

  test('lights activate in the proper sequence', async () => {
    jest.useFakeTimers();
    
    render(<HUD />);
    
    // At start (3), red light should be active
    expect(screen.getByTestId('light-red')).toHaveClass('active');
    expect(screen.getByTestId('light-yellow')).not.toHaveClass('active');
    expect(screen.getByTestId('light-green')).not.toHaveClass('active');
    
    // At 2, yellow light should be active
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('light-red')).not.toHaveClass('active');
    expect(screen.getByTestId('light-yellow')).toHaveClass('active');
    expect(screen.getByTestId('light-green')).not.toHaveClass('active');
    
    // At 1, yellow light should still be active
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('light-red')).not.toHaveClass('active');
    expect(screen.getByTestId('light-yellow')).toHaveClass('active');
    expect(screen.getByTestId('light-green')).not.toHaveClass('active');
    
    // At GO!, green light should be active
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('light-red')).not.toHaveClass('active');
    expect(screen.getByTestId('light-yellow')).not.toHaveClass('active');
    expect(screen.getByTestId('light-green')).toHaveClass('active');
    
    jest.useRealTimers();
  });

  test('does not render the countdown when countdown is not active', () => {
    useStore.mockReturnValue({
      gameStarted: true,
      countdownActive: false,
      actions: {
        endCountdown: jest.fn()
      },
      item: '',
      controls: 'keyboard',
      currentSpeed: 0,
      currentLap: 1,
      totalLaps: 3,
      raceTime: 0,
      isRaceFinished: false,
    });
    
    render(<HUD />);
    
    // The countdown overlay should not be present
    expect(screen.queryByTestId('countdown-overlay')).not.toBeInTheDocument();
  });

  test('endCountdown is called when countdown reaches zero', () => {
    jest.useFakeTimers();
    
    const endCountdownMock = jest.fn();
    useStore.mockReturnValue({
      gameStarted: true,
      countdownActive: true,
      actions: {
        endCountdown: endCountdownMock,
        setDriftButton: jest.fn(),
        setItemButton: jest.fn(),
        setMenuButton: jest.fn(),
        setJoystickX: jest.fn()
      },
      item: '',
      controls: 'keyboard',
      currentSpeed: 0,
      currentLap: 1,
      totalLaps: 3,
      raceTime: 0,
      isRaceFinished: false,
    });
    
    render(<HUD />);
    
    // Advance through 3, 2, 1
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    // endCountdown should be called when it hits GO!
    expect(endCountdownMock).toHaveBeenCalled();
    
    jest.useRealTimers();
  });

  test('race stats and speed display are properly rendered', () => {
    render(<HUD />);
    
    // Check if lap counter is rendered
    const lapValue = screen.getByText('1/3');
    expect(lapValue).toBeInTheDocument();
    
    // Check if timer is rendered
    const timer = screen.getByText('02:05:500');
    expect(timer).toBeInTheDocument();
    
    // Check if speed is rendered
    const speed = screen.getByText('80');
    expect(speed).toBeInTheDocument();
    
    // Check if KM/H label is rendered
    const speedUnit = screen.getByText('KM/H');
    expect(speedUnit).toBeInTheDocument();
  });
}); 