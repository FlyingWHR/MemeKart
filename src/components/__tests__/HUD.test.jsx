import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Create a mock HUD component for testing
const MockHUD = ({ gameStarted, controls, item, currentSpeed }) => {
  if (!gameStarted) return null;
  
  return (
    <div data-testid="hud">
      {item && (
        <div className="item">
          <img src={`./images/${item}.webp`} alt="item" data-testid="item-image" />
        </div>
      )}
      
      {controls === 'touch' && (
        <div className="touch-controls" data-testid="touch-controls">
          <div className="item-button" data-testid="item-button">item</div>
          <div data-testid="joystick-container">
            <div data-testid="joystick">Joystick</div>
          </div>
        </div>
      )}
      
      <div className="speed-display">
        <div className="speed-value" data-testid="speed-value">{currentSpeed}</div>
        <div className="speed-unit" data-testid="speed-unit">KM/H</div>
      </div>
    </div>
  );
};

describe('HUD Component (mocked)', () => {
  it('renders HUD when game is started', () => {
    render(
      <MockHUD 
        gameStarted={true}
        controls="touch"
        item="banana"
        currentSpeed={100}
      />
    );
    expect(screen.getByTestId('hud')).toBeInTheDocument();
  });
  
  it('does not render HUD when game is not started', () => {
    render(
      <MockHUD 
        gameStarted={false}
        controls="touch"
        item="banana"
        currentSpeed={0}
      />
    );
    expect(screen.queryByTestId('hud')).not.toBeInTheDocument();
  });
  
  it('displays item image when player has an item', () => {
    render(
      <MockHUD 
        gameStarted={true}
        controls="touch"
        item="banana"
        currentSpeed={100}
      />
    );
    expect(screen.getByTestId('item-image')).toBeInTheDocument();
  });
  
  it('shows touch controls when control type is touch', () => {
    render(
      <MockHUD 
        gameStarted={true}
        controls="touch"
        item="banana"
        currentSpeed={100}
      />
    );
    expect(screen.getByTestId('touch-controls')).toBeInTheDocument();
  });
  
  it('does not show touch controls when control type is keyboard', () => {
    render(
      <MockHUD 
        gameStarted={true}
        controls="keyboard"
        item="banana"
        currentSpeed={100}
      />
    );
    expect(screen.queryByTestId('touch-controls')).not.toBeInTheDocument();
  });
  
  it('displays the current speed', () => {
    render(
      <MockHUD 
        gameStarted={true}
        controls="keyboard"
        item="banana"
        currentSpeed={100}
      />
    );
    expect(screen.getByTestId('speed-value')).toHaveTextContent('100');
    expect(screen.getByTestId('speed-unit')).toHaveTextContent('KM/H');
  });
}); 