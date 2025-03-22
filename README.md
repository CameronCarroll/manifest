# RTS Game with Three.js

A single-player real-time strategy game built with Three.js featuring persistent game state across multiple sessions.

## Features

- Entity Component System (ECS) architecture
- Command Pattern for player actions (supporting undo/redo)
- Efficient A* pathfinding
- Persistent game state using IndexedDB
- 3D rendering with Three.js

## Project Structure

```
/src
  /core                 # Core game systems
    GameLoop.js         # Main game loop
    GameState.js        # Central state management
    SaveSystem.js       # Persistence with IndexedDB
    SceneManager.js     # Three.js scene management
    EntityManager.js    # Entity management for ECS
    
  /entities             # Entity definitions and components
    /components         # Data components for ECS
    /systems            # Systems that operate on components
    /definitions        # Entity blueprints/factories
    
  /ui                   # User interface elements
    /menus              # Game menus
    /components         # Reusable UI components
    
  /utils                # Utility functions
    InputManager.js     # Player input handling with Command Pattern
    pathfinding.js      # A* pathfinding implementation
    
  /loaders              # Asset loading utilities
    ModelLoader.js      # 3D model and texture loading
    
  index.js              # Main application entry point
  
/public                 # Static assets
  index.html            # HTML entry point
```

## Architecture

The game uses an Entity Component System (ECS) architecture:

- **Entities** are just IDs
- **Components** are pure data structures
- **Systems** contain the game logic and operate on components

The Command Pattern is used for all player actions, enabling features like:
- Undo/redo functionality
- Replay capabilities
- Action logging
- Potential for networked multiplayer

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd rts-game

# Install dependencies
npm install

# Start development server
npm run dev
```

## Save System

The game uses IndexedDB for persistent storage:

- Save/load game state across browser sessions
- Automatic versioning for save data compatibility
- Support for multiple save slots

## License

MIT