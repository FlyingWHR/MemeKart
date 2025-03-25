import React, { useEffect, useRef, useState } from "react";
import { useStore } from "./components/store";
import gsap from "gsap";

// Character selection component
const CharacterSelection = ({ onBack, onSelect }) => {
  const { characters, selectedCharacter, actions } = useStore();
  const [currentCharacter, setCurrentCharacter] = useState(selectedCharacter);

  const handleCharacterSelect = (characterId) => {
    setCurrentCharacter(characterId);
  };

  const handleConfirmSelection = () => {
    actions.setSelectedCharacter(currentCharacter);
    onSelect();
  };

  // Function to render stat bars
  const renderStatBars = (value, maxValue = 5) => {
    return Array.from({ length: maxValue }).map((_, index) => (
      <div 
        key={index} 
        className={`stat-bar ${index < value ? 'filled' : ''}`}
      />
    ));
  };

  return (
    <div className="character-selection">
      <h2>Choose Your Meme</h2>
      
      <div className="character-preview">
        <div 
          className="character-preview-model" 
          style={{ 
            backgroundImage: `url(${characters.find(c => c.id === currentCharacter)?.image || ''})` 
          }}
        />
      </div>
      
      <div className="character-grid">
        {characters.map((character) => (
          <div 
            key={character.id}
            className={`character-card ${currentCharacter === character.id ? 'selected' : ''}`}
            onClick={() => handleCharacterSelect(character.id)}
          >
            <div className="character-image">
              <img src={character.image} alt={character.name} />
            </div>
            <div className="character-name">{character.name}</div>
            <div className="character-stats">
              <div className="stat-row">
                <span className="stat-label">Speed</span>
                <div className="stat-bars">
                  {renderStatBars(character.speed)}
                </div>
              </div>
              <div className="stat-row">
                <span className="stat-label">Accel</span>
                <div className="stat-bars">
                  {renderStatBars(character.acceleration)}
                </div>
              </div>
              <div className="stat-row">
                <span className="stat-label">Handling</span>
                <div className="stat-bars">
                  {renderStatBars(character.handling)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="character-select-nav">
        <button className="back-btn" onClick={onBack}>Back</button>
        <button className="select-btn" onClick={handleConfirmSelection}>Select</button>
      </div>
    </div>
  );
};

// Keyboard controls component for reuse
const KeyboardControls = ({ forwardRef }) => {
  return (
    <div className="controls-start" ref={forwardRef}>
      <h2>KEYBOARD CONTROLS</h2>
      <ul>
        <li>
          <div className="key-container">
            <span className="key">W</span>
            <span className="key">↑</span>
          </div>
          <span>Accelerate</span>
        </li>
        <li>
          <div className="key-container">
            <span className="key">A</span>
            <span className="key">←</span>
          </div>
          <span>Turn Left</span>
        </li>
        <li>
          <div className="key-container">
            <span className="key">S</span>
            <span className="key">↓</span>
          </div>
          <span>Brake/Reverse</span>
        </li>
        <li>
          <div className="key-container">
            <span className="key">D</span>
            <span className="key">→</span>
          </div>
          <span>Turn Right</span>
        </li>
        <li>
          <div className="key-container">
            <span className="key">Space</span>
          </div>
          <span>Drift/Jump</span>
        </li>
        <li>
          <div className="key-container">
            <span className="key">E</span>
          </div>
          <span>Use Item</span>
        </li>
        <li>
          <div className="key-container">
            <span className="key">R</span>
          </div>
          <span>Reset Position</span>
        </li>
        <li>
          <div className="key-container">
            <span className="key">Esc</span>
          </div>
          <span>Pause Menu</span>
        </li>
      </ul>
    </div>
  );
};

export const Landing = () => {
  const { gameStarted, actions } = useStore();

  const logo = useRef();
  const startButton = useRef();
  const controlsRef = useRef();
  const initialControlsRef = useRef();
  const homeRef = useRef();
  const [setupStatus, setSetupStatus] = useState(0);

  // 0: Initial screen with logo and start button
  // 1: Character selection screen
  // 2: Controls display screen

  useEffect(() => {
    const tl = gsap.timeline();

    if (setupStatus === 0) {
      if (logo.current && startButton.current && initialControlsRef.current) {
        tl.from(logo.current, {
          scale: 122,
          opacity: 0,
          duration: 0,
          ease: "power4.out",
        })
          .to(logo.current, {
            scale: 1,
            opacity: 1,
            duration: 1.5,
            ease: "power4.out",
          })
          .to([startButton.current, initialControlsRef.current], {
            opacity: 1,
            duration: 1.5,
            delay: 0.2,
            ease: "power4.out",
          });
      }
    } else if (setupStatus === 2) {
      if (controlsRef.current) {
        tl.to(controlsRef.current, {
          opacity: 1,
          duration: 1,
          ease: "power4.out",
        });
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && setupStatus === 0) {
        setSetupStatus(1); // Go to character selection
      }
    };

    document.body.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.removeEventListener('keydown', handleKeyDown);
    };
  }, [setupStatus, actions]);

  const handleStartGame = () => {
    actions.setControls("keyboard");
    actions.setGameStarted(true);
  };

  const handleCharacterSelected = () => {
    setSetupStatus(2); // Show controls screen after character selection
  };

  if (gameStarted) {
    return null;
  }

  return (
    <>
      <div className="home" ref={homeRef}>
        {setupStatus === 0 && (
          <>
            <div className="logo">
              <img ref={logo} src="./logo.png" alt="MemeKart logo" />
            </div>
            <div className="start" ref={startButton}>
              <button className="start-button"
                onClick={() => setSetupStatus(1)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setSetupStatus(1);
                  }
                }} autoFocus>
                PRESS ENTER TO START
              </button>
            </div>
            <KeyboardControls forwardRef={initialControlsRef} />
          </>
        )}

        {setupStatus === 1 && (
          <CharacterSelection 
            onBack={() => setSetupStatus(0)}
            onSelect={handleCharacterSelected}
          />
        )}

        {setupStatus === 2 && (
          <>
            <KeyboardControls forwardRef={controlsRef} />
            <div className="start">
              <button className="start-button"
                onClick={handleStartGame}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleStartGame();
                  }
                }} autoFocus>
                PRESS ENTER TO START RACE
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};
