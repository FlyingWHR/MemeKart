import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

describe('Game Store', () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test
    const { actions } = useStore.getState();
    useStore.setState({
      gameStarted: false,
      controls: "",
      particles1: [],
      particles2: [],
      leftWheel: null,
      rightWheel: null,
      bodyRotation: null,
      pastPositions: [],
      shouldSlowdown: false,
      bananas: [],
      items: ["mushroom", "shell", "banana"],
      item: "",
      shells: [],
      skids: [],
      coins: 0,
      players: [],
      body: null,
      id: "",
      joystickX: 0,
      driftButton: false,
      itemButton: false,
      menuButton: false,
      isDrifting: false,
    });
  });

  it('should have the correct initial state', () => {
    const state = useStore.getState();
    
    expect(state.gameStarted).toBe(false);
    expect(state.controls).toBe("");
    expect(state.particles1).toEqual([]);
    expect(state.particles2).toEqual([]);
    expect(state.bananas).toEqual([]);
    expect(state.shells).toEqual([]);
    expect(state.coins).toBe(0);
    expect(state.players).toEqual([]);
  });

  it('should set gameStarted state', () => {
    const { actions } = useStore.getState();
    
    actions.setGameStarted(true);
    
    expect(useStore.getState().gameStarted).toBe(true);
  });

  it('should set controls type', () => {
    const { actions } = useStore.getState();
    
    actions.setControls('keyboard');
    
    expect(useStore.getState().controls).toBe('keyboard');
  });

  it('should add and remove bananas', () => {
    const { actions } = useStore.getState();
    const banana = { id: 'banana1', position: { x: 0, y: 0, z: 0 } };
    
    actions.addBanana(banana);
    
    expect(useStore.getState().bananas).toContainEqual(banana);
    
    actions.removeBananaById('banana1');
    
    expect(useStore.getState().bananas).not.toContainEqual(banana);
  });

  it('should add and remove shells', () => {
    const { actions } = useStore.getState();
    const shell = { id: 'shell1', position: { x: 0, y: 0, z: 0 } };
    
    actions.addShell(shell);
    
    expect(useStore.getState().shells).toContainEqual(shell);
    
    actions.removeShell(shell);
    
    expect(useStore.getState().shells).not.toContainEqual(shell);
  });

  it('should manage coin count', () => {
    const { actions } = useStore.getState();
    
    actions.addCoins();
    
    expect(useStore.getState().coins).toBe(1);
    
    actions.looseCoins();
    
    expect(useStore.getState().coins).toBe(0);
  });

  it('should set and get the current speed', () => {
    const { actions } = useStore.getState();
    
    // Test setting speed to a positive value
    actions.setCurrentSpeed(60);
    expect(useStore.getState().currentSpeed).toBe(60);
    expect(actions.getCurrentSpeed()).toBe(60);
    
    // Test setting speed to zero
    actions.setCurrentSpeed(0);
    expect(useStore.getState().currentSpeed).toBe(0);
    expect(actions.getCurrentSpeed()).toBe(0);
    
    // Test setting speed to a different value
    actions.setCurrentSpeed(120);
    expect(useStore.getState().currentSpeed).toBe(120);
    expect(actions.getCurrentSpeed()).toBe(120);
  });

  it('should add and remove players', () => {
    const { actions } = useStore.getState();
    const player = { id: 'player1', name: 'Test Player' };
    
    actions.addPlayer(player);
    
    expect(useStore.getState().players).toContainEqual(player);
    
    actions.removePlayer(player);
    
    expect(useStore.getState().players).not.toContainEqual(player);
  });

  it('should set and use items', () => {
    const { actions } = useStore.getState();
    
    // Mock Math.random to return a predictable value to test setItem
    const originalMathRandom = Math.random;
    Math.random = () => 0; // Will select the first item ("mushroom")
    
    actions.setItem();
    
    expect(useStore.getState().item).toBe("mushroom");
    
    actions.useItem();
    
    expect(useStore.getState().item).toBe("");
    
    // Restore Math.random
    Math.random = originalMathRandom;
  });
}); 