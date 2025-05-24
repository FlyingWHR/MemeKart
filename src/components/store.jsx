import { create } from "zustand";

export const playAudio = (path, callback) => {
  const audio = new Audio(`./sounds/${path}.mp3`);
  if (callback) {
    audio.addEventListener("ended", callback);
  }
  audio.play();
};
export const items = [
  "banana",
  "shell",
  "mushroom", 
  "memeSticker",
  "downvote", 
  "trollTrap", // Added Troll Trap item
]

export const useStore = create((set, get) => ({
  gameStarted: false,
  controls: "",
  particles1: [],
  particles2: [],
  leftWheel: null,
  rightWheel: null,
  bodyRotation: null,
  pastPositions: [],
  playerEffects: {}, // To store player-specific effects (slowdown, disorientation)
  bananas: [],
  items: ["mushroom", "shell", "banana", "memeSticker", "downvote", "trollTrap"], // Added trollTrap
  item: null,
  shells: [],
  trollTraps: [], // Array to store active troll traps {id, position, rotation}
  // State for Meme Sticker
  isStickerActive: false,
  stickerImage: null,
  stickerEndTime: 0,
  skids: [],
  coins : 0,
  players : [],
  body: null,
  id : "",
  joystickX: 0,
  driftButton: false,
  itemButton: false,
  menuButton: false,
  isDrifting: false,
  currentSpeed: 0,
  selectedCharacter: "doge",
  currentLap: 0,
  raceTime: 0,
  nextCheckpointIndex: 0,
  totalLaps: 3,
  isRaceFinished: false,
  countdownActive: false,
  kartPlacedOnGround: false,
  selectionActive: false,
  
  characters: [
    { id: "doge", name: "Doge", speed: 3, acceleration: 3, handling: 3, weight: 3, image: "/images/characters/doge.png" },
    { id: "grumpy", name: "Grumpy Cat", speed: 2, acceleration: 5, handling: 4, weight: 1, image: "/images/characters/grumpy.png" },
    { id: "pepe", name: "Pepe", speed: 4, acceleration: 2, handling: 3, weight: 2, image: "/images/characters/pepe.png" },
    { id: "wojak", name: "Wojak", speed: 2, acceleration: 4, handling: 5, weight: 1, image: "/images/characters/wojak.png" },
    { id: "cheems", name: "Cheems", speed: 3, acceleration: 3, handling: 4, weight: 2, image: "/images/characters/cheems.png" },
    { id: "chadoge", name: "Chadoge", speed: 5, acceleration: 1, handling: 1, weight: 5, image: "/images/characters/chadoge.png" }
  ],
  addPastPosition: (position) => {
    set((state) => ({
      pastPositions: [position, ...state.pastPositions.slice(0, 499)],
    }));
  },
  actions: {
    addParticle1: (particle) => {
      set((state) => ({
        particles1: [...state.particles1, particle],
      }));
    },
    removeParticle1: (particle) => {
      set((state) => ({
        particles1: state.particles1.filter((p) => p.id !== particle.id),
      }));
    },
    addParticle2: (particle) => {
      set((state) => ({
        particles2: [...state.particles2, particle],
      }));
    },
    removeParticle2: (particle) => {
      set((state) => ({
        particles2: state.particles2.filter((p) => p.id !== particle.id),
      }));
    },
    setBodyPosition: (position) => {
      set({ bodyPosition: position });
    },
    setBodyRotation: (rotation) => {
      set({ rotation });
    },
    getBodyPosition: () => {
      return get().bodyPosition;
    },
    getBodyRotation: () => {
      return get().bodyRotation;
    },
    // Refactored setShouldSlowDown and getShouldSlowDown to use playerEffects for the current player
    setShouldSlowDown: (isSlowed) => { // Used by banana collision
      const playerId = get().id;
      if (!playerId) return;
      if (isSlowed) {
        get().actions.applySlowdown(playerId, 1500); // Banana slowdown duration 1.5s
      } else {
        get().actions.removeSlowdown(playerId);
      }
    },
    getShouldSlowDown: () => { // Check for current player
      const playerId = get().id;
      if (!playerId) return false;
      return get().playerEffects[playerId]?.isSlowed || false;
    },
    // New actions for Downvote item
    applySlowdown: (targetPlayerId, duration) => {
      set((state) => ({
        playerEffects: {
          ...state.playerEffects,
          [targetPlayerId]: {
            ...(state.playerEffects[targetPlayerId] || {}),
            isSlowed: true,
            slowEndTime: Date.now() + duration,
          },
        },
      }));
      playAudio("downvote_hit"); // Placeholder sound

      setTimeout(() => {
        get().actions.removeSlowdown(targetPlayerId);
      }, duration);
    },
    removeSlowdown: (targetPlayerId) => {
      set((state) => ({
        playerEffects: {
          ...state.playerEffects,
          [targetPlayerId]: {
            ...(state.playerEffects[targetPlayerId] || {}),
            isSlowed: false,
            slowEndTime: 0,
          },
        },
      }));
    },
    // Troll Trap Actions
    addTrollTrap: (trapData) => {
      set((state) => ({
        trollTraps: [...state.trollTraps, trapData],
      }));
    },
    removeTrollTrapById: (trapId) => {
      set((state) => ({
        trollTraps: state.trollTraps.filter((trap) => trap.id !== trapId),
      }));
    },
    // Disorientation Actions
    applyDisorientation: (targetPlayerId, type = 'invertedControls', duration = 3000) => {
      set((state) => ({
        playerEffects: {
          ...state.playerEffects,
          [targetPlayerId]: {
            ...(state.playerEffects[targetPlayerId] || {}),
            isDisoriented: true,
            disorientationType: type,
            disorientationEndTime: Date.now() + duration,
          },
        },
      }));
      playAudio("trollolol"); // Placeholder sound for troll trap activation

      setTimeout(() => {
        get().actions.removeDisorientation(targetPlayerId);
      }, duration);
    },
    removeDisorientation: (targetPlayerId) => {
      set((state) => ({
        playerEffects: {
          ...state.playerEffects,
          [targetPlayerId]: {
            ...(state.playerEffects[targetPlayerId] || {}),
            isDisoriented: false,
            disorientationType: null,
            disorientationEndTime: 0,
          },
        },
      }));
    },
    addBanana: (banana) => {
      set((state) => ({
        bananas: [...state.bananas, banana],
      }));
    },
    removeBanana: (banana) => {
      set((state) => ({
        bananas: state.bananas.filter((id) => id !== banana.id),
      }));
    },
    getBananas: () => {
      return get().bananas;
    },
    removeBananaById: (id) => {
      set((state) => ({
        bananas: state.bananas.filter((b) => b.id !== id),
      }));
    },
    setBananas: (bananas) => {
      set({ bananas });
    },
    setItem:() => {
      const availableItems = get().items; // Use get() to access current items array
      set({ item: availableItems[Math.floor(Math.random() * availableItems.length)] });
    },
    // Action to apply meme sticker
    applyMemeSticker: () => {
      const memeImages = ["trollface.png", "doge_sticker.png", "pepe_sticker.png"]; // Assuming these files will exist
      const randomMeme = memeImages[Math.floor(Math.random() * memeImages.length)];
      const stickerDuration = 3000; // 3 seconds

      set({
        isStickerActive: true,
        stickerImage: `/images/memes/${randomMeme}`,
        stickerEndTime: Date.now() + stickerDuration,
      });
      playAudio("sticker_apply"); // Placeholder sound

      // Schedule removal of sticker
      setTimeout(() => {
        get().actions.removeMemeSticker();
      }, stickerDuration);
    },
    removeMemeSticker: () => {
      set({ isStickerActive: false, stickerImage: null, stickerEndTime: 0 });
      playAudio("sticker_remove"); // Placeholder sound
    },
    useItem:() => {
      const currentItem = get().item;
      const ownPlayerId = get().id; // Get current player's ID
      if (!currentItem || !ownPlayerId) return;

      if (currentItem === "memeSticker") {
        get().actions.applyMemeSticker();
      } else if (currentItem === "mushroom") {
        console.log("Used mushroom (effect handled in PlayerController)");
      } else if (currentItem === "downvote") {
        get().actions.applySlowdown(ownPlayerId, 4000); 
      } else if (currentItem === "trollTrap") {
        // PlayerController will handle placement & then call setItem(null)
        // For now, useItem doesn't consume it directly to allow placement phase.
        // If PlayerController directly calls addTrollTrap and setItem(null), this branch is just for logging.
        console.log("Troll Trap selected for placement.");
      }
      // Add other item logic here as they are implemented

      // Consume the item (except for trollTrap which is consumed after placement in PlayerController)
      if (currentItem !== "trollTrap") { 
         set({ item: null });
      }
    },
    addShell: (shell) => {
      set((state) => ({
        shells: [...state.shells, shell],
      }));
    },
    removeShell: (shell) => {
      set((state) => ({
        shells: state.shells.filter((s) => s.id !== shell.id),
      }));
    },
    addSkid: (skid) => {
      set((state) => ({
        skids: [...state.skids, skid],
      }));
    },
    addCoins : () => {
      set((state) => ({
        coins: state.coins + 1,
      }));
    },
    looseCoins : () => {
      set((state) => ({
        coins: state.coins - 1,
      }));
    },
    addPlayer : (player) => {
      set((state) => ({
        players: [...state.players, player],
      }));
    },
    removePlayer : (player) => {
      set((state) => ({
        players: state.players.filter((p) => p.id !== player.id),
      }));
    },
    setId : (id) => {
      set((state) => ({
        id,
        // Initialize playerEffects for the current player when ID is set
        playerEffects: {
          ...state.playerEffects,
          [id]: {
            isSlowed: false,
            slowEndTime: 0,
            isDisoriented: false,
            disorientationType: null,
            disorientationEndTime: 0,
            // Add other potential effects with default values here
          },
        },
      }));
    },
    setGameStarted: (gameStarted) => {
      set({ gameStarted });
    },
    setControls: (controls) => {
      set({ controls });
    },
    setJoystickX: (joystickX) => {
      set({ joystickX });
    },
    setDriftButton: (driftButton) => {
      set({ driftButton });
    },
    setItemButton: (itemButton) => {
      set({ itemButton });
    },
    setMenuButton: (menuButton) => {
      set({ menuButton });
    },
    setBody: (body) => {
      set({ body });
    },
    setLeftWheel: (leftWheel) => {
      set({ leftWheel });
    },
    setRightWheel: (rightWheel) => {
      set({ rightWheel });
    },
    setIsDrifting: (isDrifting) => {
      set({ isDrifting });
    },
    getIsDrifting: () => {
      return get().isDrifting;
    },
    setSelectedCharacter: (characterId) => {
      set({ selectedCharacter: characterId });
    },
    getSelectedCharacter: () => {
      const characterId = get().selectedCharacter;
      return get().characters.find(char => char.id === characterId);
    },
    setCurrentSpeed: (speed) => {
      set({ currentSpeed: speed });
    },
    getCurrentSpeed: () => {
      return get().currentSpeed;
    },
    setLap: (lap) => {
      set({ currentLap: lap });
    },
    incrementRaceTime: (deltaTime) => {
      set((state) => ({ raceTime: state.raceTime + deltaTime }));
    },
    resetRace: () => {
      set({ 
        currentLap: 1, 
        raceTime: 0, 
        nextCheckpointIndex: 0,
        isRaceFinished: false 
      });
    },
    setNextCheckpoint: (checkpointIndex) => {
      set({ nextCheckpointIndex: checkpointIndex });
    },
    incrementLap: () => {
      set((state) => {
        const newLap = state.currentLap + 1;
        const isFinished = newLap > state.totalLaps;
        return { 
          currentLap: newLap,
          isRaceFinished: isFinished 
        };
      });
    },
    finishRace: () => {
      set({ isRaceFinished: true });
    },
    setKartPlacedOnGround: (placed) => {
      console.log(`Setting kartPlacedOnGround to ${placed}`);
      set({ kartPlacedOnGround: placed });
    },
    startCountdown: () => {
      console.log("Starting countdown");
      set({ countdownActive: true });
    },
    endCountdown: () => {
      console.log("Ending countdown");
      set({ countdownActive: false });
      set(state => ({ raceTime: 0 }));
      console.log("Race timer reset");
    },
    setSelectionActive: (active) => {
      set({ selectionActive: active });
    }
  }
}));
