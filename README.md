# MemeKart - JavaScript/WebGL Meme Racing Game

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/Lunakepio/Mario-Kart-3.js)

## Game Overview

MemeKart is a web-based racing game inspired by classic kart racing games but featuring internet meme characters and themes. Built with JavaScript, Three.js, and React, it offers fun arcade-style racing with drift mechanics, items, and character-specific stats.

**Current Development Status:** Approximately 50% complete - core mechanics implemented, with more features planned.

## Credits

This game is based on [Mario Kart JS](https://codespaces.new/Lunakepio/Mario-Kart-3.js) by Lunakepio. MemeKart builds upon this foundation with additional features and meme-themed content.

## Demo

[Play MemeKart](https://github.com/FlyingWHR/MemeKart) (GitHub Repository)

## Installation

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Setup Steps

1. Clone the repository

   ```bash
   git clone [repository-url]
   cd kart
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Start the development server

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173/`

## Gameplay Instructions

- **Character Selection:** Choose your meme character with unique stats at the start screen
- **Movement Controls:**
  - <kbd>W</kbd> or <kbd>↑</kbd> - Accelerate
  - <kbd>A</kbd>/<kbd>←</kbd> and <kbd>D</kbd>/<kbd>→</kbd> - Steer left/right
  - <kbd>S</kbd> or <kbd>↓</kbd> - Brake/reverse
  - <kbd>Space</kbd> - Hold to drift, release for mini-turbo
  - <kbd>E</kbd> - Use current item
  - <kbd>R</kbd> - Reset position
  - <kbd>Esc</kbd> - Pause menu
- **HUD Features:**
  - Speed displayed in KM/H (bottom-right corner)
  - Current item shown in top-left corner
  - Touch controls available on mobile devices

## Browser Compatibility

MemeKart works best on:

- Chrome/Edge (latest versions)
- Firefox (latest version)
- Safari 14+

The game is playable on mobile browsers but has best performance on desktop.

## Development

### Project Structure

```
kart/
├── public/          # Static assets (models, textures, sounds)
├── src/             # Source code
│   ├── components/  # React components
│   ├── models/      # 3D model components
│   ├── sounds/      # Audio files
│   └── index.jsx    # Entry point
├── tests/           # Test files
└── package.json     # Dependencies and scripts
```

### Tools Used

- Vite - Development environment
- Three.js - 3D rendering
- React Three Fiber - React bindings for Three.js
- Zustand - State management
- React-Three/Rapier - Physics engine
- Vitest - Testing framework

### Editor Support

The project supports [Triplex](https://triplex.dev/download) for visual editing of components:

- Open the project in Triplex from the root directory
- Edit components visually and see changes in real-time
- [Learn more about Triplex](https://triplex.dev/docs/get-started/user-interface)

## Testing

This project uses Vitest and React Testing Library for testing:

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

Tests cover:

- Game state management (store)
- UI components (Landing, HUD)
- Integration between components

## Features Implemented

### Keyboard Controls on Landing Screen

- Displays all keyboard controls clearly to users on the initial landing page
- Shows both WASD and arrow key alternatives
- Uses a similar visual style to match the game's aesthetic
- Controls appear automatically with the logo and "PRESS ENTER TO START" button
- Responsive design that works well on mobile and desktop devices

### Character Selection Screen

- Interactive selection of popular meme characters with visual preview
- Features memes like Doge, Grumpy Cat, Pepe, Wojak, Cheems, and Chadoge
- Displays character stats (Speed, Acceleration, Handling)
- Shows visual indicators for character attributes
- Character selection affects gameplay
- Clean, responsive UI that matches the game's meme aesthetic

### Speed Display

- Dynamic speed indicator in the bottom-right corner of the screen
- Shows the kart's speed in KM/H with a racing-style display
- Features a transparent background with blue glow effects
- Updates in real-time as you drive
- Converts raw speed values to more realistic kilometers per hour

## TO-DO List

- [x] Design Landing page
- [x] Add keyboard controls display on the landing screen
- [x] Add character selection screen
- [x] Add speed display to HUD
- [ ] Add items
- [ ] Add texture to the flame shaders
- [ ] Add curve/length modifiers to drift particles 3/4
- [ ] Add Skid marks
- [x] Add smokes
- [ ] Add wind screen effect when boosting
- [ ] Improve sound design quality
- [ ] Design UI for HUD
- [ ] Make Time Trial mode
- [ ] Design tracks and checkpoints
- [ ] Improve code quality
- [ ] Add Minimap

### Planned Items

- [ ] Meme stickers
- [ ] Downvote (slows opponents)
- [ ] Upvote boost
- [ ] Troll face trap
- [ ] More to come...

## Known Issues

- Mobile performance may vary by device
- Some physics glitches when driving at high speeds
- Occasional visual artifacts with particle effects

## How to Contribute

Contributions are welcome! Feel free to:

- Submit bug reports or feature requests via issues
- Fork the repository and submit pull requests
- Suggest new meme characters or items

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This project is licensed under the MIT License - see the LICENSE file for details.
