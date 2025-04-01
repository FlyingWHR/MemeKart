import { renderHook, act } from '@testing-library/react-hooks';
import { useAudioFallback } from '../components/useAudioFallback';
import { expect, vi, describe, it, beforeEach } from 'vitest';

// Mock fetch for testing URL existence checks
global.fetch = vi.fn((url, options) => {
  if (url.includes('missing') || url.includes('error')) {
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

describe('useAudioFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('returns the original URL when file exists', async () => {
    let result;
    
    await act(async () => {
      result = renderHook(() => useAudioFallback('./sounds/exists.mp3')).result;
      
      // Wait for async fetch to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(global.fetch).toHaveBeenCalledWith('./sounds/exists.mp3', { method: 'HEAD' });
    expect(result.current.url).toBe('./sounds/exists.mp3');
    expect(result.current.exists).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });
  
  it('uses fallback URL when primary URL fails', async () => {
    let result;
    
    await act(async () => {
      result = renderHook(() => 
        useAudioFallback('./sounds/missing.mp3', './sounds/fallback.mp3')
      ).result;
      
      // Wait for async fetch operations to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(global.fetch).toHaveBeenCalledWith('./sounds/missing.mp3', { method: 'HEAD' });
    expect(global.fetch).toHaveBeenCalledWith('./sounds/fallback.mp3', { method: 'HEAD' });
    expect(result.current.url).toBe('./sounds/fallback.mp3');
    expect(result.current.exists).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });
  
  it('returns an error when both primary and fallback URLs fail', async () => {
    let result;
    
    await act(async () => {
      result = renderHook(() => 
        useAudioFallback('./sounds/missing.mp3', './sounds/error.mp3')
      ).result;
      
      // Wait for async fetch operations to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(global.fetch).toHaveBeenCalledWith('./sounds/missing.mp3', { method: 'HEAD' });
    expect(global.fetch).toHaveBeenCalledWith('./sounds/error.mp3', { method: 'HEAD' });
    expect(result.current.url).toBe(null);
    expect(result.current.exists).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error.message).toContain('Audio file not found');
  });
  
  it('handles fetch errors gracefully', async () => {
    global.fetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));
    
    let result;
    
    await act(async () => {
      result = renderHook(() => useAudioFallback('./sounds/network-error.mp3')).result;
      
      // Wait for async fetch to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(global.fetch).toHaveBeenCalledWith('./sounds/network-error.mp3', { method: 'HEAD' });
    expect(result.current.url).toBe(null);
    expect(result.current.exists).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error.message).toBe('Network error');
  });
}); 