import React, { useEffect, useRef, useState } from "react";
import { useStore } from "./components/store";
import gsap from "gsap";
import { getVehicleStatsForCharacter } from "./config/vehicleStats";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// 3D Model preview component
const CharacterModel = ({ characterId }) => {
  const modelRef = useRef();
  
  // Use a generic kart model as all characters share the same model structure
  const { nodes, materials } = useGLTF('./models/characters/mariokarttest.glb');
  
  // Apply slow rotation animation
  useFrame((state, delta) => {
    if(modelRef.current) {
      modelRef.current.rotation.y += delta * 0.5; // Slow spin (0.5 radians per second)
    }
  });

  return (
    <group ref={modelRef} rotation={[0, -0.2, 0]} scale={1.3} position={[0, -0.5, 0]}>
      {/* Kart body */}
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mt_kart_Mario_S.geometry}
        material={materials.mt_kart_Mario_S}
      />
      {/* Kart tires */}
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mt_Kart_Mario_Tire_S001.geometry}
        material={materials.mt_Kart_Mario_Tire_S}
        position={[0, 0.22, -0.347]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mt_Kart_Mario_Tire_S002.geometry}
        material={materials.mt_Kart_Mario_Tire_S}
        position={[0.37, 0.193, 0.441]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mt_Kart_Mario_Tire_S003.geometry}
        material={materials.mt_Kart_Mario_Tire_S}
        position={[-0.37, 0.193, 0.441]}
        rotation={[-Math.PI, 0, 0]}
        scale={-1}
      />
      {/* Character body - in a real implementation, this would change based on characterId */}
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mt_mario.geometry}
        material={materials.mt_mario}
      />
    </group>
  );
};

// Character selection component
const CharacterSelection = ({ onBack, onSelect }) => {
  const { characters, selectedCharacter, actions } = useStore();
  const [currentCharacter, setCurrentCharacter] = useState(selectedCharacter);
  const [focusedIndex, setFocusedIndex] = useState(
    characters.findIndex(char => char.id === selectedCharacter) || 0
  );
  // Add a ready state to prevent immediate Enter key processing
  const [isReady, setIsReady] = useState(false);
  const modelContainerRef = useRef(); // Reference for model container animations

  // Set ready state after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 300); // 300ms delay before accepting Enter key
    
    return () => clearTimeout(timer);
  }, []);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip processing if component is not ready yet
      if (!isReady && e.key === 'Enter') {
        e.preventDefault();
        return;
      }
      
      // Get the current index of the focused character
      const currentIndex = characters.findIndex(char => char.id === currentCharacter);
      
      switch (e.key) {
        case 'ArrowRight':
          // Move focus right, or wrap to first card if at the end
          const nextIndex = (currentIndex + 1) % characters.length;
          setFocusedIndex(nextIndex);
          e.preventDefault();
          break;
          
        case 'ArrowLeft':
          // Move focus left, or wrap to last card if at the beginning
          const prevIndex = (currentIndex - 1 + characters.length) % characters.length;
          setFocusedIndex(prevIndex);
          e.preventDefault();
          break;
          
        case 'ArrowUp':
          // Move up a row (assuming 3 characters per row)
          const upIndex = (currentIndex - 3 + characters.length) % characters.length;
          setFocusedIndex(upIndex);
          e.preventDefault();
          break;
          
        case 'ArrowDown':
          // Move down a row (assuming 3 characters per row)
          const downIndex = (currentIndex + 3) % characters.length;
          setFocusedIndex(downIndex);
          e.preventDefault();
          break;
          
        case 'Enter':
          // If a character card is focused or select button has focus
          if (document.activeElement.classList.contains('character-card') ||
              document.activeElement.classList.contains('select-btn')) {
            // Select the currently focused character
            actions.setSelectedCharacter(currentCharacter);
            onSelect();
            e.preventDefault();
          }
          break;
          
        case 'Escape':
          // Go back to the previous screen
          onBack();
          e.preventDefault();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [characters, currentCharacter, actions, onSelect, onBack, isReady]);

  // Handle character selection with animation
  const handleCharacterSelect = (characterId) => {
    if (characterId === currentCharacter) return;
    
    // Apply animation to the model container when changing characters
    if (modelContainerRef.current) {
      // Quick animation sequence: scale down, change character, scale back up
      gsap.timeline()
        .to(modelContainerRef.current, {
          scale: 0.9, 
          opacity: 0.7, 
          duration: 0.15,
          ease: "power2.out",
          onComplete: () => setCurrentCharacter(characterId)
        })
        .to(modelContainerRef.current, {
          scale: 1, 
          opacity: 1, 
          duration: 0.2,
          ease: "back.out(1.5)"
        });
    } else {
      setCurrentCharacter(characterId);
    }
  };

  // Focus on the character card when component mounts or focusedIndex changes
  useEffect(() => {
    const cards = document.querySelectorAll('.character-card');
    if (cards && cards.length > 0 && cards[focusedIndex]) {
      cards[focusedIndex].focus();
      
      // Trigger the character select animation when navigating with keyboard
      handleCharacterSelect(characters[focusedIndex].id);
    }
  }, [focusedIndex, characters]);

  // Helper function to render stat bars
  const renderStatBars = (statValue) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <div
        key={index}
        className={`stat-bar ${index < statValue ? "filled" : ""}`}
      />
    ));
  };

  // Get vehicle stats description for the selected character
  const vehicleStats = getVehicleStatsForCharacter(currentCharacter);

  return (
    <div className="character-selection">
      <h2>SELECT YOUR CHARACTER</h2>
      
      <div className="character-selection-content">
        {/* Preview area - moved to the left side */}
        <div className="character-preview">
          {/* Add 3D model preview instead of 2D image */}
          <div 
            className="character-preview-model" 
            ref={modelContainerRef}
          >
            <Canvas
              shadows
              dpr={[1, 2]}
              gl={{ alpha: true }}
              camera={{ position: [0, 1.1, 6.5], fov: 22.2 }}
            >
              <ambientLight intensity={0.9} />
              <directionalLight position={[5, 5, 5]} intensity={1.1} castShadow />
              <directionalLight position={[-5, 5, -5]} intensity={0.7} />
              <CharacterModel characterId={currentCharacter} />
              <OrbitControls
                enableZoom={false}
                enablePan={false}
                enableRotate={false}
              />
            </Canvas>
          </div>
          
          {/* Show vehicle stats description */}
          <div className="vehicle-description">
            {vehicleStats.description}
          </div>
          <div className="keyboard-controls-hint">
            <span className="hint-text">Use</span>
            <span className="key-hint">←</span>
            <span className="key-hint">↑</span>
            <span className="key-hint">↓</span>
            <span className="key-hint">→</span>
            <span className="hint-text">to navigate,</span>
            <span className="key-hint">Enter</span>
            <span className="hint-text">to select,</span>
            <span className="key-hint">Esc</span>
            <span className="hint-text">to go back</span>
          </div>
        </div>

        {/* Selection area - right side */}
        <div className="character-selection-right">
          <div className="character-grid">
            {characters.map((character, index) => (
              <div
                key={character.id}
                className={`character-card ${currentCharacter === character.id ? 'selected' : ''}`}
                onClick={() => handleCharacterSelect(character.id)}
                tabIndex={0}
                onFocus={() => setCurrentCharacter(character.id)}
                aria-selected={currentCharacter === character.id}
                data-index={index}
              >
                <div className="character-image">
                  <img src={character.image} alt={character.name} />
                </div>
                <div className="character-name">{character.name}</div>
                <div className="character-stats">
                  <div className="stat-row">
                    <div className="stat-label">Speed</div>
                    <div className="stat-bars">
                      {renderStatBars(character.speed)}
                    </div>
                  </div>
                  <div className="stat-row">
                    <div className="stat-label">Accel</div>
                    <div className="stat-bars">
                      {renderStatBars(character.acceleration)}
                    </div>
                  </div>
                  <div className="stat-row">
                    <div className="stat-label">Handle</div>
                    <div className="stat-bars">
                      {renderStatBars(character.handling)}
                    </div>
                  </div>
                  <div className="stat-row">
                    <div className="stat-label">Weight</div>
                    <div className="stat-bars">
                      {renderStatBars(character.weight)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="character-select-nav">
            <button 
              className="back-btn" 
              onClick={onBack}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onBack();
                }
              }}
            >BACK</button>
            <button 
              className="select-btn" 
              onClick={() => {
                actions.setSelectedCharacter(currentCharacter);
                onSelect();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  actions.setSelectedCharacter(currentCharacter);
                  onSelect();
                }
              }}
            >START</button>
          </div>
        </div>
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
  const characterSelectionRef = useRef();
  const [setupStatus, setSetupStatus] = useState(0);

  // 0: Initial screen with logo and start button
  // 1: Character selection screen - modified to go directly to game after this

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
            duration: 1.2, // Faster animation
            ease: "power4.out",
          })
          .to([startButton.current, initialControlsRef.current], {
            opacity: 1,
            duration: 1, // Faster animation
            delay: 0.1, // Less delay
            ease: "power4.out",
          });
      }
    } else if (setupStatus === 1 && characterSelectionRef.current) {
      // Faster animation for character selection screen appearance
      gsap.fromTo(
        characterSelectionRef.current, 
        { opacity: 0, y: 30 }, // Less movement
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" } // Faster animation with different easing
      );
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Enter') {
        if (setupStatus === 0) {
          // Prevent default to stop propagation of this Enter keypress
          event.preventDefault();
          
          // Faster fade out animation before transitioning
          if (logo.current && startButton.current && initialControlsRef.current) {
            gsap.to([logo.current, startButton.current, initialControlsRef.current], {
              opacity: 0,
              duration: 0.3, // Faster animation
              onComplete: () => setSetupStatus(1)
            });
          } else {
            setSetupStatus(1); // Fallback if refs are not available
          }
        }
      } else if (event.key === 'Escape') {
        // Go back to previous screen
        if (setupStatus === 1) {
          // Faster fade out animation before transitioning back
          if (characterSelectionRef.current) {
            gsap.to(characterSelectionRef.current, {
              opacity: 0,
              y: 30, // Less movement
              duration: 0.3, // Faster animation
              onComplete: () => {
                setSetupStatus(0);
                // Show initial screen elements after transition
                if (startButton.current && initialControlsRef.current) {
                  gsap.to([startButton.current, initialControlsRef.current], {
                    opacity: 1,
                    duration: 0.3 // Faster animation
                  });
                  gsap.to(logo.current, {
                    opacity: 1,
                    duration: 0.3 // Faster animation
                  });
                }
              }
            });
          } else {
            setSetupStatus(0); // Fallback if ref is not available
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setupStatus, actions]);

  // Effect to handle visibility when returning to landing screen
  useEffect(() => {
    if (setupStatus === 0 && startButton.current && initialControlsRef.current) {
      // Make sure controls are visible when returning from character selection
      gsap.to([startButton.current, initialControlsRef.current], {
        opacity: 1,
        duration: 0.5
      });
    }
  }, [setupStatus]);

  const handleStartGame = () => {
    actions.setControls("keyboard");
    actions.setGameStarted(true);
  };

  const handleCharacterSelected = () => {
    // Faster exit animation before starting game
    if (characterSelectionRef.current) {
      gsap.to(characterSelectionRef.current, {
        opacity: 0,
        scale: 0.97, // Less scale change
        duration: 0.3, // Faster animation
        onComplete: () => handleStartGame()
      });
    } else {
      handleStartGame(); // Fallback if ref is not available
    }
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
                onClick={() => {
                  // Faster fade out animation when clicking the start button
                  if (logo.current && startButton.current && initialControlsRef.current) {
                    gsap.to([logo.current, startButton.current, initialControlsRef.current], {
                      opacity: 0,
                      duration: 0.3, // Faster animation
                      onComplete: () => setSetupStatus(1)
                    });
                  } else {
                    setSetupStatus(1);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setSetupStatus(1);
                  }
                }} autoFocus>
                PRESS ENTER TO CONTINUE
              </button>
            </div>
            <KeyboardControls forwardRef={initialControlsRef} />
          </>
        )}

        {setupStatus === 1 && (
          <div ref={characterSelectionRef}>
            <CharacterSelection 
              onBack={() => {
                // Faster exit animation when going back
                if (characterSelectionRef.current) {
                  gsap.to(characterSelectionRef.current, {
                    opacity: 0,
                    y: 30, // Less movement
                    duration: 0.3, // Faster animation
                    onComplete: () => {
                      setSetupStatus(0);
                      // Show initial screen elements after transition
                      if (logo.current && startButton.current && initialControlsRef.current) {
                        gsap.to(logo.current, {
                          opacity: 1,
                          duration: 0.3 // Faster animation
                        });
                        gsap.to([startButton.current, initialControlsRef.current], {
                          opacity: 1,
                          duration: 0.3 // Faster animation
                        });
                      }
                    }
                  });
                } else {
                  setSetupStatus(0);
                }
              }}
              onSelect={handleCharacterSelected}
            />
          </div>
        )}
      </div>
    </>
  );
};
