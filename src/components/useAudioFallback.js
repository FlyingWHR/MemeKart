import { useEffect, useState } from 'react';

/**
 * Hook to check if audio files exist and provide fallbacks
 * @param {string} url The audio file URL to check
 * @param {string} fallbackUrl Optional fallback URL if the main one fails
 * @returns {{url: string, exists: boolean, loading: boolean, error: any}}
 */
export const useAudioFallback = (url, fallbackUrl = null) => {
  const [state, setState] = useState({
    url: url,
    exists: false,
    loading: true,
    error: null
  });

  useEffect(() => {
    let isMounted = true;

    const checkAudio = async () => {
      try {
        // First try a HEAD request which is faster
        const response = await fetch(url, { method: 'HEAD' });
        
        if (response.ok) {
          if (isMounted) {
            setState({
              url,
              exists: true,
              loading: false,
              error: null
            });
          }
          return;
        }
        
        // If HEAD failed and we have a fallback, try that instead
        if (fallbackUrl) {
          try {
            const fallbackResponse = await fetch(fallbackUrl, { method: 'HEAD' });
            
            if (fallbackResponse.ok && isMounted) {
              setState({
                url: fallbackUrl,
                exists: true,
                loading: false,
                error: null
              });
              return;
            }
          } catch (fallbackErr) {
            console.warn("Fallback audio check failed:", fallbackErr);
          }
        }
        
        // Both url and fallback failed
        if (isMounted) {
          setState({
            url: null,
            exists: false,
            loading: false,
            error: new Error(`Audio file not found: ${url}`)
          });
        }
      } catch (err) {
        if (isMounted) {
          setState({
            url: null,
            exists: false,
            loading: false,
            error: err
          });
        }
      }
    };

    checkAudio();

    return () => {
      isMounted = false;
    };
  }, [url, fallbackUrl]);

  return state;
};

// Create a silent audio blob URL
const createSilentAudio = (duration = 1) => {
  // Create an audio context
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
  
  // Fill with silence
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < channelData.length; i++) {
    channelData[i] = 0;
  }
  
  // Convert to WAV
  const wavData = audioBufferToWav(audioBuffer);
  
  // Create a blob URL
  const blob = new Blob([wavData], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

// Convert AudioBuffer to WAV format
const audioBufferToWav = (buffer) => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2;
  const result = new Uint8Array(44 + length);
  
  // RIFF identifier and chunk size
  writeString(result, 0, 'RIFF');
  result[4] = (length + 36) & 0xff;
  result[5] = ((length + 36) >> 8) & 0xff;
  result[6] = ((length + 36) >> 16) & 0xff;
  result[7] = ((length + 36) >> 24) & 0xff;
  
  // WAVE identifier
  writeString(result, 8, 'WAVE');
  
  // fmt sub-chunk
  writeString(result, 12, 'fmt ');
  result[16] = 16; // length of the fmt
  result[17] = 0;
  result[18] = 0;
  result[19] = 0;
  result[20] = 1; // PCM format
  result[21] = 0;
  result[22] = numOfChan;
  result[23] = 0;
  
  // Sample rate
  result[24] = buffer.sampleRate & 0xff;
  result[25] = (buffer.sampleRate >> 8) & 0xff;
  result[26] = (buffer.sampleRate >> 16) & 0xff;
  result[27] = (buffer.sampleRate >> 24) & 0xff;
  
  // Byte rate
  const byteRate = buffer.sampleRate * numOfChan * 2;
  result[28] = byteRate & 0xff;
  result[29] = (byteRate >> 8) & 0xff;
  result[30] = (byteRate >> 16) & 0xff;
  result[31] = (byteRate >> 24) & 0xff;
  
  // Block align
  result[32] = numOfChan * 2;
  result[33] = 0;
  
  // Bits per sample
  result[34] = 16;
  result[35] = 0;
  
  // Data sub-chunk
  writeString(result, 36, 'data');
  result[40] = length & 0xff;
  result[41] = (length >> 8) & 0xff;
  result[42] = (length >> 16) & 0xff;
  result[43] = (length >> 24) & 0xff;
  
  // Write the PCM samples
  let index = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numOfChan; channel++) {
      const sample = buffer.getChannelData(channel)[i] * 0x7fff;
      result[index++] = sample & 0xff;
      result[index++] = (sample >> 8) & 0xff;
    }
  }
  
  return result.buffer;
};

// Helper function to write a string to a Uint8Array
const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view[offset + i] = string.charCodeAt(i);
  }
}; 