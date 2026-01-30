# 🚀 VoidWorks

**Version:** v0.10.0 (Alpha)  
**Genre:** Multiplayer Space Survival Sandbox

VoidWorks is a browser-based multiplayer online game where players explore, gather resources, build bases, and strive to survive in an infinitely generated space. This project is developed using a **Monorepo** architecture, with the frontend and backend sharing core logic and communication protocols.

---

## 🏗️ Project Architecture

This project is managed using **npm workspaces** and is divided into three main modules:

### 1. `packages/common` (Core Shared Layer)
* **Purpose:** Defines constants, data structures, and communication protocols shared between the frontend and backend.
* **Technology:** Google Protocol Buffers (`.proto`), JavaScript.
* **Key File:** `protocol/voidworks.proto` (Defines all packet formats).

### 2. `packages/server` (Game Server)
* **Purpose:** Handles physics simulation, game logic, map generation, and broadcasting game state.
* **Technology:** Node.js, **uWebSockets.js** (High-performance WebSocket), **p2.js** (Physics Engine), **simplex-noise** (Map Generation).
* **Key Feature:** Authoritative Server architecture. All logical computations are performed on the server.

### 3. `packages/client` (Game Client)
* **Purpose:** Responsible for rendering graphics, receiving user input, and playing sound effects.
* **Technology:** Vite, **Pixi.js** (WebGL Rendering), WebSocket.
* **Key Features:** Uses interpolation for smooth movement and includes a UI management system.

---

## ⚡ Quick Start

### Prerequisites
* **Node.js:** v18.0.0 or higher
* **npm:** v7.0.0 or higher (Supports Workspaces)

### Installation Steps

1.  **Clone the Repository**

2.  **Install Dependencies (Run once at the project root)**
    This will automatically install all dependencies for the client, server, and common packages.
    ```bash
    npm install
    ```

3.  **Enter your local MySQL password at \voidworks\packages\server\.env**

---------

## 🎮 Running the Game

This project uses a **Monorepo** architecture, requiring both the **Server** and **Client** to be running simultaneously to play. Ensure you are in the project root directory (`voidworks/`).

### Option 1: One-Command Start (Recommended) 🚀
Use `concurrently` to launch both the frontend and backend at once. Ideal for general development and gameplay.
```bash
npm run dev
```
Terminal Output: You will see logs prefixed with [SERVER] (blue) and [CLIENT] (magenta) appear simultaneously.
Game URL: Once launched, open your browser and navigate to http://localhost:5173.

### Option 2: Separate Startup (For Debugging) 🛠️
If you wish to monitor logs from the frontend and backend separately, open two terminal windows and run each command individually.

Terminal 1: Start the Server

npm run dev:server
The server will start at ws://localhost:8080.
It handles physics simulation and game logic.

Terminal 2: Start the Client

npm run dev:client
The client will start at http://localhost:5173.
It handles graphics rendering and user input.

Troubleshooting
Q1: npm run dev gives a command not found error?
A1: Ensure you have run npm install. This will automatically install the concurrently package.

Q2: Seeing [SERVER] Address already in use?
A2: This means the server port (8080) is already occupied. You may already have a server running in another terminal. Please close it first.

## 🕹️ Controls
W, A, S, D	Move character
Mouse Cursor	Control aim and shooting direction
Left Mouse Button	Shoot / Mine asteroids
B	Build a wall (Requires Stone)
1 - 5	Switch hotbar slots

## 🌟 Current Features (Phase 10)
Survival System:
Oxygen (O2): Depletes over time. Health decreases when O2 reaches zero.
Health (HP): Decreases when taking damage or suffocating. Player respawns upon death.
UI: Dynamic HP/O2 progress bars displayed in the top-left corner.

Procedural Map:
Infinite terrain generated using Simplex Noise.
Contains Wall and Asteroid clusters.

Gathering & Building:
Mine Copper Ore and Iron/Stone Asteroids.
Use gathered resources to build defensive walls.

High-Performance Synchronization:
Supports synchronization of hundreds of entities (packet size limit optimized).
Binary transmission using Protocol Buffers.

## 🛠️ Development Workflow
Modifying the Communication Protocol (.proto)
If you modify packages/common/protocol/voidworks.proto, you must regenerate the JavaScript definition files.
Important: After modifying the Protocol, clear your browser cache (Hard Reload). Otherwise, the client may use outdated definitions, causing decoding errors.

Collaboration Rules
Main Branch: Maintains a stable, always-runnable state.
Feature Branch: Create a new branch for new features (e.g., feature/add-inventory-ui).
Pull Request: Submit a PR for code review upon completion.

## Troubleshooting

Q1: The screen is black (void) upon entering the game?
A1: This is usually caused by the browser caching old .proto files. Press F12 -> Right-click the refresh button -> Select "Empty Cache and Hard Reload".

Q2: Cannot see other players or asteroids?
A2: Check if maxPayloadLength in packages/server/src/Server.js is set to 1024 * 1024 (1MB).
