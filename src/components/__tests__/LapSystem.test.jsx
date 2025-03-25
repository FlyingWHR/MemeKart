import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStore } from '../store';

// Mock Date.now for predictable test results
const mockNow = 1000;
vi.spyOn(Date, 'now').mockImplementation(() => mockNow);

describe('Lap and Timer System', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useStore.setState({
      currentLap: 0,
      totalLaps: 3,
      raceStarted: false,
      raceFinished: false,
      raceStartTime: null,
      currentLapStartTime: null,
      raceTime: 0,
      lapTimes: [],
      bestLapTime: null,
      checkpoints: []
    });
  });

  it('should initialize with correct default values', () => {
    const state = useStore.getState();
    
    expect(state.currentLap).toBe(0);
    expect(state.totalLaps).toBe(3);
    expect(state.raceStarted).toBe(false);
    expect(state.raceFinished).toBe(false);
    expect(state.raceStartTime).toBeNull();
    expect(state.currentLapStartTime).toBeNull();
    expect(state.raceTime).toBe(0);
    expect(state.lapTimes).toEqual([]);
    expect(state.bestLapTime).toBeNull();
    expect(state.checkpoints).toEqual([]);
  });

  it('should start the race with proper timing values', () => {
    const { actions } = useStore.getState();
    
    actions.startRace();
    const state = useStore.getState();
    
    expect(state.raceStarted).toBe(true);
    expect(state.raceFinished).toBe(false);
    expect(state.raceStartTime).toBe(mockNow);
    expect(state.currentLapStartTime).toBe(mockNow);
    expect(state.currentLap).toBe(1);
    expect(state.lapTimes).toEqual([]);
    expect(state.raceTime).toBe(0);
  });

  it('should properly record completed laps', () => {
    const { actions } = useStore.getState();
    
    // Start the race
    actions.startRace();
    
    // Advance mock time by 10 seconds for first lap
    vi.spyOn(Date, 'now').mockImplementation(() => mockNow + 10000);
    
    // Complete first lap
    actions.completeLap();
    let state = useStore.getState();
    
    expect(state.currentLap).toBe(2);
    expect(state.lapTimes).toEqual([10000]);
    expect(state.bestLapTime).toBe(10000);
    expect(state.currentLapStartTime).toBe(mockNow + 10000);
    
    // Advance mock time by 8 seconds for second lap (faster lap)
    vi.spyOn(Date, 'now').mockImplementation(() => mockNow + 18000);
    
    // Complete second lap
    actions.completeLap();
    state = useStore.getState();
    
    expect(state.currentLap).toBe(3);
    expect(state.lapTimes).toEqual([10000, 8000]);
    expect(state.bestLapTime).toBe(8000); // Should update to fastest lap
    
    // Advance mock time by 12 seconds for final lap
    vi.spyOn(Date, 'now').mockImplementation(() => mockNow + 30000);
    
    // Complete final lap
    actions.completeLap();
    state = useStore.getState();
    
    expect(state.raceFinished).toBe(true);
    expect(state.lapTimes).toEqual([10000, 8000, 12000]);
    expect(state.bestLapTime).toBe(8000); // Should still be the fastest lap
    expect(state.raceTime).toBe(30000); // Total race time
  });

  it('should track checkpoints correctly', () => {
    const { actions } = useStore.getState();
    
    // Start the race
    actions.startRace();
    
    // Pass checkpoints
    actions.passCheckpoint('cp1');
    actions.passCheckpoint('cp2');
    actions.passCheckpoint('cp3');
    
    let state = useStore.getState();
    expect(state.checkpoints).toEqual(['cp1', 'cp2', 'cp3']);
    
    // Complete lap (should reset checkpoints)
    actions.completeLap();
    state = useStore.getState();
    expect(state.checkpoints).toEqual([]);
    
    // Pass checkpoints in next lap
    actions.passCheckpoint('cp1');
    state = useStore.getState();
    expect(state.checkpoints).toEqual(['cp1']);
  });

  it('should reset race state properly', () => {
    const { actions } = useStore.getState();
    
    // Start race and pass some checkpoints
    actions.startRace();
    actions.passCheckpoint('cp1');
    
    // Reset race
    actions.resetRace();
    const state = useStore.getState();
    
    expect(state.raceStarted).toBe(false);
    expect(state.raceFinished).toBe(false);
    expect(state.raceStartTime).toBeNull();
    expect(state.currentLapStartTime).toBeNull();
    expect(state.currentLap).toBe(0);
    expect(state.lapTimes).toEqual([]);
    expect(state.raceTime).toBe(0);
    expect(state.bestLapTime).toBeNull();
    expect(state.checkpoints).toEqual([]);
  });
}); 