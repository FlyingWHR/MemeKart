import '@testing-library/jest-dom';
import { vi } from 'vitest';
import * as THREE from 'three';
import React from 'react';

// Mock three.js WebGLRenderer
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      setClearColor: vi.fn(),
      render: vi.fn(),
      domElement: document.createElement('canvas'),
      shadowMap: {},
      toneMapping: 0,
      dispose: vi.fn()
    })),
  };
});

// Mock @react-three/fiber hooks
vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useThree: vi.fn().mockReturnValue({
      gl: {
        domElement: document.createElement('canvas'),
        setClearColor: vi.fn(),
        toneMapping: 0
      },
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      setSize: vi.fn(),
      viewport: { width: 800, height: 600 },
      pointer: { x: 0, y: 0 }
    }),
    useFrame: vi.fn().mockImplementation((callback) => {
      // Optional: Call the callback once with mock state, delta
      callback && callback({ clock: { getElapsedTime: () => 0 } }, 0.016);
    }),
  };
});

// Mock @react-three/drei
vi.mock('@react-three/drei', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useGLTF: vi.fn().mockReturnValue({
      nodes: {},
      materials: {},
      scene: new THREE.Scene()
    }),
    PerspectiveCamera: vi.fn().mockImplementation(({ children, ...props }) => {
      return React.createElement('div', { 'data-testid': 'perspective-camera' }, children);
    }),
    useKeyboardControls: vi.fn().mockReturnValue(false)
  };
});

// Mock @react-three/rapier
vi.mock('@react-three/rapier', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    RigidBody: vi.fn().mockImplementation(({ children, ...props }) => {
      return React.createElement('div', { 'data-testid': 'rigid-body' }, children);
    }),
    useRapier: vi.fn().mockReturnValue({
      rapier: {},
      world: {}
    }),
    vec3: vi.fn().mockReturnValue({
      set: vi.fn(),
      normalize: vi.fn(),
      length: vi.fn().mockReturnValue(0),
      x: 0,
      y: 0,
      z: 0
    })
  };
});

// Mock zustand
vi.mock('zustand', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
  };
});

// Mock playroomkit
vi.mock('playroomkit', async () => {
  return {
    insertCoin: vi.fn().mockResolvedValue({}),
    onPlayerJoin: vi.fn().mockImplementation(callback => {
      // Mock a player state and call the callback with it
      callback({
        id: 'mock-player-id',
        onQuit: vi.fn(),
        state: {}
      });
      return vi.fn();
    }),
    isHost: vi.fn().mockReturnValue(true),
    myPlayer: vi.fn().mockReturnValue({ 
      id: 'mock-player-id',
      state: {}
    }),
    getState: vi.fn(),
    useMultiplayerState: vi.fn().mockReturnValue([[], vi.fn()]),
  };
});

// Mock audio elements
window.HTMLMediaElement.prototype.play = vi.fn();
window.HTMLMediaElement.prototype.pause = vi.fn();
window.HTMLMediaElement.prototype.load = vi.fn(); 