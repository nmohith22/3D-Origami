# 3D Origami Simulator

A browser-based 3D origami folding simulator built with React and Three.js. It allows users to interact with a physical 3D paper model, make mathematically precise folds, and manipulate the result in a 3D environment.

## Features

- **Interactive Folding Engine**: Users can grab the perimeter edges or corners of the paper and drag them to create folds.
- **Dynamic Physics Model**: The application calculates perpendicular bisectors based on drag inputs and dynamically deforms the mesh geometry in real-time.
- **Sticky Folding**: Support for free-form angular folds, allowing for the creation of 3D models like paper airplanes where flaps remain partially elevated.
- **Dynamic Handle Spawning**: Every committed fold mathematically intersects the paper to generate new grabbable edges and corners along the newly formed creases.
- **Transform Controls**: A toggleable 3D gizmo allows users to move and rotate their folded creations in space.
- **History Management**: Full undo and redo support for complex origami sequences.

## Technologies Used

- **React**: Frontend UI framework.
- **Three.js**: Core 3D WebGL engine.
- **@react-three/fiber**: React renderer for Three.js.
- **@react-three/drei**: Useful helpers and abstractions for React Three Fiber (PivotControls, ContactShadows, OrbitControls).
- **@use-gesture/react**: Pointer interaction handling for precise drag-and-drop fold mechanics.
- **Vite**: Build tool and development server.

## Getting Started

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the local development server.
