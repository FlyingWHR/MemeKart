// add some testing library react specific matchers
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.URL.createObjectURL
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn(() => 'mock-url');
  window.URL.revokeObjectURL = vi.fn();
}

// Mock AudioContext
class MockAudioContext {
  constructor() {
    this.sampleRate = 44100;
    this.destination = {};
    this.state = 'running';
  }
  
  createBuffer() {
    return {
      duration: 1,
      length: 44100,
      sampleRate: 44100,
      numberOfChannels: 1,
      getChannelData: vi.fn(() => new Float32Array(44100))
    };
  }
  
  createGain() {
    return {
      connect: vi.fn(),
      gain: { value: 1 }
    };
  }
  
  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };
  }
}

// Mock WebAudio API
if (typeof window !== 'undefined') {
  window.AudioContext = MockAudioContext;
  window.webkitAudioContext = MockAudioContext;
}

// Mock the MediaElementAudioSourceNode
if (typeof window !== 'undefined') {
  class MockMediaElementAudioSourceNode {
    constructor() {}
    connect() {}
    disconnect() {}
  }
  
  window.AudioContext.prototype.createMediaElementSource = function() {
    return new MockMediaElementAudioSourceNode();
  };
}

// Suppress console errors during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    /Warning.*not wrapped in act/i.test(args[0]) ||
    /Warning.*ReactDOM.render is no longer supported/i.test(args[0])
  ) {
    return;
  }
  originalConsoleError(...args);
}; 