import React, { useState, useEffect } from 'react';
import { useStore } from './store';

export const RaceCountdown = () => {
  const { gameStarted, raceStarted, actions } = useStore();
  const [countdown, setCountdown] = useState(null);
  const [showCountdown, setShowCountdown] = useState(false);
  
  useEffect(() => {
    let timer;
    
    if (gameStarted && !raceStarted) {
      setShowCountdown(true);
      setCountdown(3);
      
      // Start the countdown
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 'GO!';
          }
          return prev - 1;
        });
      }, 1000);
      
      // Hide the countdown after it completes
      const hideTimer = setTimeout(() => {
        setShowCountdown(false);
      }, 4000);
      
      return () => {
        clearInterval(timer);
        clearTimeout(hideTimer);
      };
    } else {
      setShowCountdown(false);
    }
  }, [gameStarted, raceStarted]);
  
  if (!showCountdown) return null;
  
  return (
    <div className="race-countdown">
      <div className={`countdown-number ${countdown === 'GO!' ? 'go' : ''}`}>
        {countdown}
      </div>
    </div>
  );
}; 