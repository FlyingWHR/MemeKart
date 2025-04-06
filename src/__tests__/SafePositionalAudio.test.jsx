import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { SafePositionalAudio } from '../components/SafePositionalAudio';
import { ErrorTrackerProvider } from '../components/ErrorTracker';
import { expect, vi, describe, it, beforeEach } from 'vitest';

// Mock the PositionalAudio component from drei
vi.mock('@react-three/drei', () => ({
  PositionalAudio: vi.fn(({ ref, url, onError, ...props }) => {
    // Simulate successful loading for valid URLs and errors for invalid ones
    if (url.includes('missing')) {
      setTimeout(() => onError(new Error('Audio file not found')), 0);
      return null;
    }
    
    if (ref) {
      ref.current = {
        play: vi.fn(),
        stop: vi.fn(),
        isPlaying: false,
        setVolume: vi.fn(),
        setPlaybackRate: vi.fn()
      };
    }
    
    return <div data-testid="positional-audio" data-url={url} />;
  })
}));

// Mock fetch for testing URL existence checks
global.fetch = vi.fn((url, options) => {
  if (url.includes('missing')) {
    return Promise.resolve({
      ok: false,
      status: 404
    });
  }
  
  return Promise.resolve({
    ok: true,
    status: 200
  });
});

describe('SafePositionalAudio', () => {
  const addError = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders successfully with valid audio file', async () => {
    const ref = { current: null };
    
    render(
      <ErrorTrackerProvider value={{ addError }}>
        <SafePositionalAudio 
          ref={ref} 
          url="./sounds/valid.mp3" 
          distance={5}
          loop={false}
        />
      </ErrorTrackerProvider>
    );
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('./sounds/valid.mp3', { method: 'HEAD' });
    });
    
    expect(addError).not.toHaveBeenCalled();
    expect(ref.current).toBeTruthy();
    expect(ref.current.play).toBeDefined();
  });
  
  it('handles missing audio files gracefully', async () => {
    const ref = { current: null };
    
    render(
      <ErrorTrackerProvider value={{ addError }}>
        <SafePositionalAudio 
          ref={ref} 
          url="./sounds/missing.mp3" 
          distance={5}
          loop={false}
        />
      </ErrorTrackerProvider>
    );
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('./sounds/missing.mp3', { method: 'HEAD' });
    });
    
    expect(addError).toHaveBeenCalledWith(expect.stringContaining('Audio file not found'), 'audio');
    
    // Should still provide stub methods
    expect(ref.current).toBeTruthy();
    expect(ref.current.play).toBeDefined();
    expect(ref.current.stop).toBeDefined();
  });
  
  it('forwards all props to PositionalAudio when file exists', async () => {
    render(
      <ErrorTrackerProvider value={{ addError }}>
        <SafePositionalAudio 
          url="./sounds/valid.mp3" 
          distance={10}
          loop={true}
          volume={0.8}
        />
      </ErrorTrackerProvider>
    );
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('./sounds/valid.mp3', { method: 'HEAD' });
    });
    
    const audio = screen.queryByTestId('positional-audio');
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute('data-url', './sounds/valid.mp3');
  });
}); 