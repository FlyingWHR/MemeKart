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
  shouldSlowdown: false,
  bananas: [],
  items: ["mushroom", "shell", "banana"],
  item: null,
  shells: [],
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
    setShouldSlowDown: (shouldSlowdown) => {
      set({ shouldSlowdown });
    },
    getShouldSlowDown: () => {
      return get().shouldSlowdown;
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
      set((state) => ({
        item: state.items[Math.floor(Math.random() * state.items.length)],
      }));
    },
    useItem:() => {
      set((state) => ({
        item: "",
      }));
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
      set({id});
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
    }
  }
}));
