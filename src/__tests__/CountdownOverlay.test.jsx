import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { HUD } from '../HUD';
import { useStore } from '../components/store';
import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the store
vi.mock('../components/store', () => ({
  useStore: vi.fn()
}));

// Mock window.Audio
class MockAudio {
  constructor() {
    this.currentTime = 0;
  }
  
  play() {
    return Promise.resolve();
  }
  
  pause() {}
}

global.Audio = MockAudio;

describe('CountdownOverlay Component', () => {
  // Setup default store values before each test
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.mockReturnValue({
      gameStarted: true,
      countdownActive: true,
      actions: {
        endCountdown: vi.fn(),
        setDriftButton: vi.fn(),
        setItemButton: vi.fn(),
        setMenuButton: vi.fn(),
        setJoystickX: vi.fn()
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

    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders the countdown overlay when countdown is active', () => {
    render(<HUD />);
    
    // Check if traffic light is rendered
    expect(screen.getByTestId('traffic-light')).toBeInTheDocument();
    
    // Check if countdown number starts at 3
    expect(screen.getByTestId('countdown-number')).toHaveTextContent('3');
  });

  test('countdown transitions from 3 to GO!', async () => {
    vi.useFakeTimers();
    
    render(<HUD />);
    
    // Should start with 3
    expect(screen.getByTestId('countdown-number')).toHaveTextContent('3');
    
    // Advance timer to get to 2
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('countdown-number')).toHaveTextContent('2');
    
    // Advance timer to get to 1
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('countdown-number')).toHaveTextContent('1');
    
    // Advance timer to get to GO!
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('countdown-number')).toHaveTextContent('GO!');
    
    vi.useRealTimers();
  });

  test('lights activate in the proper sequence', async () => {
    vi.useFakeTimers();
    
    render(<HUD />);
    
    // At start (3), red light should be active
    expect(screen.getByTestId('light-red')).toHaveClass('active');
    expect(screen.getByTestId('light-yellow')).not.toHaveClass('active');
    expect(screen.getByTestId('light-green')).not.toHaveClass('active');
    
    // At 2, yellow light should be active
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('light-red')).not.toHaveClass('active');
    expect(screen.getByTestId('light-yellow')).toHaveClass('active');
    expect(screen.getByTestId('light-green')).not.toHaveClass('active');
    
    // At 1, yellow light should still be active
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('light-red')).not.toHaveClass('active');
    expect(screen.getByTestId('light-yellow')).toHaveClass('active');
    expect(screen.getByTestId('light-green')).not.toHaveClass('active');
    
    // At GO!, green light should be active
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('light-red')).not.toHaveClass('active');
    expect(screen.getByTestId('light-yellow')).not.toHaveClass('active');
    expect(screen.getByTestId('light-green')).toHaveClass('active');
    
    vi.useRealTimers();
  });

  test('race stats and speed display are properly rendered', () => {
    render(<HUD />);
    
    // Check if lap counter is rendered
    const lapValue = screen.getByTestId('lap-value');
    expect(lapValue).toHaveTextContent('1/3');
    
    // Check if timer is rendered
    const timer = screen.getByTestId('timer-value');
    expect(timer).toHaveTextContent('02:05:500');
    
    // Check if speed is rendered
    const speed = screen.getByTestId('speed-value');
    expect(speed).toHaveTextContent('80');
    
    // Check if KM/H label is rendered
    const speedUnit = screen.getByTestId('speed-unit');
    expect(speedUnit).toHaveTextContent('KM/H');
  });

  test('horizontal traffic light has all corner screws', () => {
    render(<HUD />);
    
    const trafficLight = screen.getByTestId('traffic-light');
    const cornerScrews = trafficLight.querySelectorAll('.corner-screw');
    
    // Should have 4 corner screws
    expect(cornerScrews.length).toBe(4);
  });

  test('formatTime helper function formats time correctly', () => {
    const { rerender } = render(<HUD />);
    
    // Test with different time values
    useStore.mockReturnValue({
      gameStarted: true,
      countdownActive: true,
      actions: {
        endCountdown: vi.fn(),
        setDriftButton: vi.fn(),
        setItemButton: vi.fn(),
        setMenuButton: vi.fn(),
        setJoystickX: vi.fn()
      },
      item: '',
      controls: 'keyboard',
      currentSpeed: 80,
      currentLap: 1,
      totalLaps: 3,
      raceTime: 65.123, // 1 minute, 5 seconds, 123 milliseconds
      isRaceFinished: false,
      kartPlacedOnGround: true
    });
    
    rerender(<HUD />);
    expect(screen.getByTestId('timer-value')).toHaveTextContent('01:05:123');
    
    // Test with seconds only
    useStore.mockReturnValue({
      gameStarted: true,
      countdownActive: true,
      actions: {
        endCountdown: vi.fn(),
        setDriftButton: vi.fn(),
        setItemButton: vi.fn(),
        setMenuButton: vi.fn(),
        setJoystickX: vi.fn()
      },
      item: '',
      controls: 'keyboard',
      currentSpeed: 80,
      currentLap: 1,
      totalLaps: 3,
      raceTime: 7.5, // 7 seconds, 500 milliseconds
      isRaceFinished: false,
      kartPlacedOnGround: true
    });
    
    rerender(<HUD />);
    expect(screen.getByTestId('timer-value')).toHaveTextContent('00:07:500');
  });
}); 