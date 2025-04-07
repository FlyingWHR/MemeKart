// add some testing library react specific matchers
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.URL.createObjectURL
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn(() => 'mock-url');
  window.URL.revokeObjectURL = vi.fn();
}

// Mock Three.js
vi.mock('three', () => {
  return {
    WebGLRenderer: vi.fn(() => ({
      setSize: vi.fn(),
      setClearColor: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      shadowMap: {},
      domElement: document.createElement('canvas'),
      dispose: vi.fn()
    })),
    Clock: vi.fn(() => ({
      getDelta: vi.fn(() => 0.1),
      getElapsedTime: vi.fn(() => 1)
    })),
    Scene: vi.fn(),
    PerspectiveCamera: vi.fn(() => ({
      position: { x: 0, y: 0, z: 0 },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn()
    })),
    Vector3: vi.fn(() => ({
      x: 0, y: 0, z: 0,
      set: vi.fn(),
      copy: vi.fn(),
      add: vi.fn(),
      sub: vi.fn(),
      multiplyScalar: vi.fn(),
      clone: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
      length: vi.fn(() => 1),
      normalize: vi.fn()
    })),
    BoxGeometry: vi.fn(),
    MeshStandardMaterial: vi.fn(),
    Mesh: vi.fn(() => ({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    })),
    Group: vi.fn(() => ({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      add: vi.fn(),
      remove: vi.fn()
    })),
    Quaternion: vi.fn(() => ({
      x: 0, y: 0, z: 0, w: 1,
      setFromEuler: vi.fn(),
      multiply: vi.fn(),
      clone: vi.fn()
    })),
    Euler: vi.fn(() => ({
      x: 0, y: 0, z: 0,
      set: vi.fn(),
      setFromQuaternion: vi.fn()
    })),
    Matrix4: vi.fn(() => ({
      makeRotationFromQuaternion: vi.fn(),
      elements: new Array(16).fill(0)
    })),
    Object3D: vi.fn(() => ({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
      up: { x: 0, y: 1, z: 0 },
      add: vi.fn(),
      remove: vi.fn(),
      lookAt: vi.fn()
    })),
    DirectionalLight: vi.fn(() => ({
      position: { x: 0, y: 0, z: 0 },
      shadow: {}
    })),
    AmbientLight: vi.fn(),
    PCFSoftShadowMap: 'PCFSoftShadowMap',
    sRGBEncoding: 'sRGBEncoding',
    VSMShadowMap: 'VSMShadowMap',
    SpotLight: vi.fn(),
    PointLight: vi.fn(),
    CameraHelper: vi.fn(),
    Color: vi.fn(() => ({
      setHex: vi.fn()
    })),
    Raycaster: vi.fn(() => ({
      set: vi.fn(),
      intersectObjects: vi.fn(() => [])
    })),
    PlaneGeometry: vi.fn(),
    SphereGeometry: vi.fn(),
    MeshBasicMaterial: vi.fn(),
    CylinderGeometry: vi.fn(),
    VideoTexture: vi.fn(),
    LinearFilter: 'LinearFilter',
    MathUtils: {
      clamp: (value, min, max) => Math.min(Math.max(value, min), max),
      degToRad: (degrees) => degrees * (Math.PI / 180),
      radToDeg: (radians) => radians * (180 / Math.PI),
      lerp: (start, end, alpha) => start + (end - start) * alpha
    }
  };
});

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => {
  return {
    useFrame: vi.fn((callback) => {
      // Call the callback once with mocked state
      callback(
        {
          clock: { getDelta: () => 0.1, getElapsedTime: () => 1 },
          camera: { position: { x: 0, y: 0, z: 0 } },
          scene: {}
        },
        0.1
      );
    }),
    useThree: vi.fn(() => ({
      gl: {
        domElement: document.createElement('canvas'),
        setClearColor: vi.fn(),
        setSize: vi.fn()
      },
      scene: {},
      camera: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        lookAt: vi.fn()
      },
      viewport: { width: 800, height: 600 },
      size: { width: 800, height: 600 }
    })),
    Canvas: vi.fn(({ children }) => {
      return { type: 'div', props: { 'data-testid': 'r3f-canvas', children } };
    }),
    extend: vi.fn()
  };
});

// Mock @react-three/drei
vi.mock('@react-three/drei', () => {
  const useGLTFMock = vi.fn(() => ({
    scene: {
      clone: vi.fn(() => ({
        traverse: vi.fn(),
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      }))
    },
    nodes: {},
    materials: {}
  }));
  
  // Add preload as a static method
  useGLTFMock.preload = vi.fn();
  
  // Create a shaderMaterial mock
  const shaderMaterialMock = vi.fn((uniforms, vertexShader, fragmentShader) => {
    return class MockShaderMaterial {
      constructor() {
        this.uniforms = uniforms;
        this.vertexShader = vertexShader;
        this.fragmentShader = fragmentShader;
      }
      static key = 'MockShaderMaterial';
    };
  });
  
  return {
    OrbitControls: vi.fn(() => null),
    PerspectiveCamera: vi.fn(({ children }) => ({ type: 'div', props: { children } })),
    Environment: vi.fn(() => null),
    Sky: vi.fn(() => null),
    useGLTF: useGLTFMock,
    useTexture: vi.fn(() => ({})),
    RoundedBox: vi.fn(({ children }) => ({ type: 'div', props: { children } })),
    Text: vi.fn(() => null),
    Loader: vi.fn(() => null),
    useKeyboardControls: vi.fn((callback) => callback({})),
    Html: vi.fn(() => null),
    Billboard: vi.fn(() => null),
    Text3D: vi.fn(() => null),
    useAnimations: vi.fn(() => ({ actions: {}, names: [] })),
    Center: vi.fn(({ children }) => ({ type: 'div', props: { children } })),
    Float: vi.fn(({ children }) => ({ type: 'div', props: { children } })),
    useHelper: vi.fn(),
    PositionalAudio: vi.fn(() => null),
    Reflector: vi.fn(() => null),
    MeshReflectorMaterial: vi.fn(() => null),
    Sphere: vi.fn(() => null),
    Cylinder: vi.fn(() => null),
    Plane: vi.fn(() => null),
    Box: vi.fn(() => null),
    shaderMaterial: shaderMaterialMock,
    extend: vi.fn()
  };
});

// Mock @react-three/rapier
vi.mock('@react-three/rapier', () => {
  return {
    RigidBody: vi.fn(({ children }) => ({ type: 'div', props: { children } })),
    useRapier: vi.fn(() => ({
      rapier: {},
      world: {
        createImpulseJoint: vi.fn(),
        removeJoint: vi.fn()
      }
    })),
    Physics: vi.fn(({ children }) => ({ type: 'div', props: { children } })),
    CuboidCollider: vi.fn(() => null),
    BallCollider: vi.fn(() => null),
    useContactMaterial: vi.fn(),
    CylinderCollider: vi.fn(() => null),
    vec3: vi.fn(() => ({ x: 0, y: 0, z: 0 }))
  };
});

// Mock playroomkit
vi.mock('playroomkit', () => {
  return {
    useMultiplayer: vi.fn(() => ({
      myPlayer: {
        id: 'player1',
        state: {},
        getState: vi.fn(),
        setState: vi.fn(),
        setMetadata: vi.fn()
      },
      players: [
        {
          id: 'player1',
          state: {},
          getState: vi.fn(),
          setState: vi.fn()
        }
      ],
      isHost: true,
      getHostId: vi.fn(() => 'player1'),
      getLayer: vi.fn(() => ({
        on: vi.fn(),
        off: vi.fn(),
        once: vi.fn(),
        broadcast: vi.fn()
      }))
    })),
    Joystick: vi.fn(() => ({
      angle: 0,
      up: false,
      down: false,
      left: false,
      right: false
    })),
    Button: vi.fn(() => ({
      pressed: false
    }))
  };
});

// Mock Canvas API
class MockCanvasRenderingContext2D {
  constructor() {
    this.canvas = {};
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
    this.font = '10px sans-serif';
    this.textAlign = 'start';
    this.textBaseline = 'alphabetic';
    this.globalAlpha = 1.0;
  }
  
  clearRect() {}
  fillRect() {}
  strokeRect() {}
  fillText() {}
  strokeText() {}
  measureText() { return { width: 10 }; }
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  bezierCurveTo() {}
  quadraticCurveTo() {}
  arc() {}
  arcTo() {}
  rect() {}
  fill() {}
  stroke() {}
  clip() {}
  scale() {}
  rotate() {}
  translate() {}
  transform() {}
  setTransform() {}
  resetTransform() {}
  createLinearGradient() { 
    return {
      addColorStop: () => {}
    };
  }
  createRadialGradient() { 
    return {
      addColorStop: () => {}
    };
  }
  createPattern() { return {}; }
  drawImage() {}
  save() {}
  restore() {}
  getImageData() { 
    return { 
      data: new Uint8ClampedArray(4), 
      width: 1, 
      height: 1 
    }; 
  }
  putImageData() {}
}

// Mock CanvasGradient and CanvasPattern
class MockCanvasGradient {
  addColorStop() {}
}

class MockCanvasPattern {}

if (typeof window !== 'undefined') {
  // Canvas mocks
  window.CanvasRenderingContext2D = MockCanvasRenderingContext2D;
  window.CanvasGradient = MockCanvasGradient;
  window.CanvasPattern = MockCanvasPattern;
  
  // Mock getContext for canvas elements
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(contextType) {
    if (contextType === '2d') {
      return new MockCanvasRenderingContext2D();
    }
    return originalGetContext.apply(this, arguments);
  };
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

// Improved Audio mock
class MockAudio {
  constructor() {
    this.autoplay = false;
    this.controls = false;
    this.currentTime = 0;
    this.volume = 1;
    this.muted = false;
    this.paused = true;
    this.loop = false;
    this.duration = 100;
    this.src = '';
    this.playbackRate = 1;
    
    // Event listeners
    this._eventListeners = {};
  }
  
  // Audio methods
  play() {
    this.paused = false;
    this._triggerEvent('play');
    this._triggerEvent('playing');
    return Promise.resolve();
  }
  
  pause() {
    this.paused = true;
    this._triggerEvent('pause');
  }
  
  load() {
    this._triggerEvent('loadeddata');
    this._triggerEvent('canplaythrough');
  }
  
  // Event handling
  addEventListener(event, callback) {
    if (!this._eventListeners[event]) {
      this._eventListeners[event] = [];
    }
    this._eventListeners[event].push(callback);
  }
  
  removeEventListener(event, callback) {
    if (this._eventListeners[event]) {
      this._eventListeners[event] = this._eventListeners[event]
        .filter(cb => cb !== callback);
    }
  }
  
  _triggerEvent(event) {
    const listeners = this._eventListeners[event] || [];
    listeners.forEach(callback => {
      callback.call(this, { target: this });
    });
  }
}

// Mock WebAudio API
if (typeof window !== 'undefined') {
  window.AudioContext = MockAudioContext;
  window.webkitAudioContext = MockAudioContext;
  window.Audio = MockAudio;
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

// Mock requestAnimationFrame and cancelAnimationFrame
if (typeof window !== 'undefined') {
  window.requestAnimationFrame = vi.fn(callback => {
    setTimeout(callback, 0);
    return Math.floor(Math.random() * 1000);
  });
  
  window.cancelAnimationFrame = vi.fn();
}

// Mock react-joystick-component
vi.mock('react-joystick-component', () => {
  const React = require('react');
  return {
    Joystick: vi.fn(({ move, stop }) => {
      return React.createElement('div', { 
        'data-testid': 'joystick', 
        onClick: () => move && move({ x: 0.5, y: 0.5 }),
        onMouseLeave: () => stop && stop() 
      });
    })
  };
});

// Mock lottie
vi.mock('src/libs/lottie.js', () => ({
  default: {
    loadAnimation: vi.fn(() => ({
      destroy: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  }
}));

// Suppress console errors during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  // Ignore errors related to testing libraries and browser APIs
  if (
    /Warning.*not wrapped in act/i.test(args[0]) ||
    /Warning.*ReactDOM.render is no longer supported/i.test(args[0]) ||
    /Not implemented:.*prototype/i.test(args[0]) ||
    /Cannot set properties of null/i.test(args[0]) ||
    /Error: Not implemented:/i.test(args[0]) ||
    /Multiple instances of Three.js/i.test(args[0]) ||
    /Function components cannot be given refs/i.test(args[0])
  ) {
    return;
  }
  originalConsoleError(...args);
}; 