import React, { useEffect, useRef, useState } from "react";
import { useStore } from "./components/store";
import { Joystick } from "react-joystick-component";
import "./CountdownStyles.css";

// Add a DEBUG flag at the top of the file
const DEBUG = false; // Set to true to enable debug logging

// Helper function to format time
const formatTime = (timeInSeconds) => {
  const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
  const milliseconds = Math.floor((timeInSeconds % 1) * 1000).toString().padStart(3, '0');
  return `${minutes}:${seconds}:${milliseconds}`;
};

// Countdown component for race start
const CountdownOverlay = () => {
  const { actions, countdownActive } = useStore();
  const [countdown, setCountdown] = useState(3);
  const [goVisible, setGoVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [showNumber, setShowNumber] = useState(false);
  const countdownSound = useRef(null);
  const startSound = useRef(null);
  const overlayRef = useRef(null);
  
  // Initialize sound refs
  useEffect(() => {
    if (DEBUG) console.log("Initializing countdown sounds");
    
    if (typeof window !== 'undefined') {
      countdownSound.current = new Audio('./sounds/jump.mp3');
      startSound.current = new Audio('./sounds/turbo.wav');
    }
    
    return () => {
      if (countdownSound.current && typeof countdownSound.current.pause === 'function') {
        countdownSound.current.pause();
        countdownSound.current = null;
      }
      if (startSound.current && typeof startSound.current.pause === 'function') {
        startSound.current.pause();
        startSound.current = null;
      }
    };
  }, []);
  
  // Reset countdown when it becomes active
  useEffect(() => {
    if (countdownActive) {
      // Show traffic light immediately
      setCountdown(3);
      setGoVisible(false);
      setIsFadingOut(false);
      setIsVisible(true);
      setShowNumber(false);
      
      // Show number after delay and play sound
      const timer = setTimeout(() => {
        setShowNumber(true);
        if (countdownSound.current) {
          countdownSound.current.currentTime = 0;
          countdownSound.current.play().catch(e => console.error("Could not play countdown sound:", e));
        }
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [countdownActive]);
  
  // Handle countdown timer logic
  useEffect(() => {
    // Exit early if countdown is not active
    if (!countdownActive) return;
    
    // Handle countdown for 3, 2, 1
    if (countdown > 0 && showNumber) {
      // Set timer for next number
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        if (countdown > 1 && countdownSound.current) {
          countdownSound.current.currentTime = 0;
          countdownSound.current.play().catch(e => console.error("Could not play countdown sound:", e));
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    } 
    // Handle GO! (when countdown === 0)
    else if (countdown === 0 && !goVisible) {
      setGoVisible(true);
      
      if (startSound.current && typeof startSound.current.play === 'function') {
        startSound.current.currentTime = 0;
        startSound.current.play().catch(e => console.error("Could not play start sound:", e));
      }
      
      actions.endCountdown();
      
      setTimeout(() => {
        setIsVisible(false);
      }, 500);
      
      return () => {};
    }
  }, [countdown, countdownActive, actions, goVisible, showNumber]);
  
  // Don't render if not visible
  if (!isVisible && !countdownActive) {
    return null;
  }
  
  // Determine which lights are active
  const redActive = countdown === 3;
  const yellowActive = countdown === 2 || countdown === 1;
  const greenActive = countdown === 0 || goVisible;
  
  return (
    <div 
      ref={overlayRef}
      className={`countdown-overlay ${isFadingOut ? 'fade-out' : ''} ${countdown === 0 || goVisible ? 'go-active' : ''}`}
      data-testid="countdown-overlay"
    >
      <div className="traffic-light-container">
        <div className="traffic-light" data-testid="traffic-light">
          <div className="corner-screw"></div>
          <div className="corner-screw"></div>
          <div className="corner-screw"></div>
          <div className="corner-screw"></div>
          <div className={`light red ${redActive ? 'active' : ''}`} data-testid="light-red"></div>
          <div className={`light yellow ${yellowActive ? 'active' : ''}`} data-testid="light-yellow"></div>
          <div className={`light green ${greenActive ? 'active' : ''}`} data-testid="light-green"></div>
        </div>
      </div>
      
      {showNumber && (
        <div 
          key={countdown} 
          className={`countdown-number ${countdown === 0 || goVisible ? 'go-text' : ''}`}
          data-testid="countdown-number"
        >
          {countdown === 0 ? "GO!" : countdown}
        </div>
      )}
    </div>
  );
};

export const HUD = () => {
  const wheel = useRef();
  const [image, setImage] = useState("");
  
  const { 
    item, 
    gameStarted, 
    actions, 
    controls, 
    currentSpeed,
    currentLap, 
    raceTime,
    totalLaps,
    isRaceFinished,
    countdownActive,
    kartPlacedOnGround
  } = useStore();

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (wheel.current) {
        const { clientX, clientY } = e;
        const screenWidth = window.innerWidth;
        const rotation = ((clientX - screenWidth / 2) / screenWidth) * 180;

        wheel.current.style.left = `${clientX - 100}px`;
        wheel.current.style.top = `${clientY - 100}px`;
        wheel.current.style.transform = `rotate(${rotation}deg)`;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const handleMove = (e) => {
    actions.setJoystickX(e.x);
  };

  const handleStop = () => {
    actions.setJoystickX(0);
  };

  useEffect(() => {
    switch (item) {
      case "banana":
        setImage("./images/banana.webp");
        break;
      case "mushroom":
        setImage("./images/mushroom.png");
        break;
      case "shell":
        setImage("./images/shell.webp");
        break;
      default:
        setImage("");
    }
  }, [item]);

  return (
    <div className="overlay">
      {gameStarted && (
        <>
          {/* Show countdown timer when countdown is active */}
          <CountdownOverlay />
        
          <div className="item">
            <div className="borderOut">
              <div className="borderIn">
                <div className="background">
                  {image && <img src={image} alt="item" width={90} />}
                </div>
              </div>
            </div>
          </div>
          
          <div className="race-stats">
            <div className="lap-container">
              <div className="lap-text">LAP</div>
              <div className="lap-value" data-testid="lap-value">{currentLap}/{totalLaps}</div>
            </div>
            <div className="timer-value" data-testid="timer-value">{formatTime(raceTime)}</div>
          </div>
          
          <div className="speed-display">
            <div 
              className="speed-value" 
              data-testid="speed-value"
              style={{ 
                transition: "all 0.3s ease-out" 
              }}
            >
              {Math.round(currentSpeed)}
            </div>
            <div className="speed-unit" data-testid="speed-unit">KM/H</div>
          </div>
          
          {/* Race Finished Message */}
          {isRaceFinished && (
            <div className="race-finished">
              <div className="finished-text">RACE FINISHED!</div>
              <div className="final-time">TIME: {formatTime(raceTime)}</div>
            </div>
          )}
          
          {controls === "touch" && (
            <>
            <div className="controls joystick">
            <Joystick
              size={100}
              sticky={false}
              baseColor="rgba(255, 255, 255, 0.5)"
              stickColor="rgba(255, 255, 255, 0.5)"
              move={handleMove}
              stop={handleStop}
            ></Joystick>
          </div>
          <div
            className="controls drift"
            onMouseDown={(e) => {
              actions.setDriftButton(true);
            }}
            onMouseUp={(e) => {
              actions.setDriftButton(false);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              actions.setDriftButton(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              actions.setDriftButton(false);
            }}
          >
            drift
          </div>
          <div
            className="controls itemButton"
            onMouseDown={(e) => {
              actions.setItemButton(true);
            }}
            onMouseUp={(e) => {
              actions.setItemButton(false);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              actions.setItemButton(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              actions.setItemButton(false);
            }}

          >
            item
          </div>
          <div
            className="controls menuButton"
            onMouseDown={(e) => {
              actions.setMenuButton(true);
            }}
            onMouseUp={(e) => {
              actions.setMenuButton(false);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              actions.setMenuButton(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              actions.setMenuButton(false);
            }}

          >
            menu
          </div>
          </>
          )}
        </>
      )}
    </div>
  );
};

