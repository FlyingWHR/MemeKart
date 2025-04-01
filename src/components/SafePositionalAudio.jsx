import { useState, useRef, useEffect, forwardRef } from "react";
import { PositionalAudio } from "@react-three/drei";
import { useErrorTracker } from './ErrorTracker';

/**
 * Safe version of PositionalAudio that handles missing files gracefully
 * Forwards the ref and provides stub methods for missing audio files
 */
export const SafePositionalAudio = forwardRef(({ url, ...props }, ref) => {
  const [error, setError] = useState(false);
  const { addError } = useErrorTracker();
  const audioRef = useRef();
  
  // Forward the ref regardless of error state
  useEffect(() => {
    if (ref) {
      const stubMethods = {
        play: () => console.log(`[Audio Stub] Would play: ${url}`),
        stop: () => console.log(`[Audio Stub] Would stop: ${url}`),
        isPlaying: false,
        setVolume: () => {},
        setPlaybackRate: () => {},
        setRefDistance: () => {},
        setRolloffFactor: () => {},
        setDistanceModel: () => {},
        setMaxDistance: () => {},
        setDirectionalCone: () => {}
      };
      
      // Always give ref access to either real methods or stubs
      ref.current = error ? stubMethods : audioRef.current || stubMethods;
    }
  }, [ref, url, error, audioRef]);
  
  useEffect(() => {
    // Check if file exists without actually loading it
    const checkFile = async () => {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok) {
          console.warn(`Audio file not found: ${url}`);
          setError(true);
          addError(`Audio file not found: ${url}`, 'audio');
        }
      } catch (err) {
        console.warn(`Error checking audio file ${url}:`, err);
        setError(true);
        addError(`Error loading audio: ${url}`, 'audio');
      }
    };
    
    checkFile();
  }, [url, addError]);
  
  // If the file doesn't exist, return null but the stub methods are already set up
  if (error) {
    return null;
  }
  
  // Handle potential errors during loading with onError
  return (
    <PositionalAudio 
      ref={(el) => {
        audioRef.current = el;
        if (ref) ref.current = el || {
          play: () => console.log(`[Audio Stub] Would play: ${url}`),
          stop: () => {},
          isPlaying: false,
          setVolume: () => {},
          setPlaybackRate: () => {}
        };
      }}
      url={url} 
      {...props} 
      onError={(e) => {
        console.warn(`Error loading audio: ${url}`, e);
        setError(true);
        addError(`Error loading audio: ${url}`, 'audio');
      }}
    />
  );
}); 