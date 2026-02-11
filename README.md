# 🚀 VoidWorks

![Version](https://img.shields.io/badge/version-v0.10.0_(Alpha)-blue) ![Genre](https://img.shields.io/badge/Genre-Multiplayer_Space_Survival_Sandbox-purple)

**VoidWorks** is a browser-based multiplayer online game. Players explore, gather resources, build bases, and strive to survive in an infinitely generated space.

This project is developed using a **Monorepo** architecture, with the frontend and backend sharing core logic and communication protocols for efficient collaboration.

---

## 🏗️ Project Architecture

This project is managed using **npm workspaces** and is divided into three main modules:

| Module | Path | Description | Key Technologies |
| :--- | :--- | :--- | :--- |
| **Shared Core** | `packages/common` | Defines constants, data structures, and communication protocols shared between frontend and backend. | JS, **Google Protocol Buffers** |
| **Game Server** | `packages/server` | Handles physics, game logic, map generation, and state broadcasting.<br>**Authoritative Server** architecture. | Node.js, **uWebSockets.js**, p2.js, simplex-noise |
| **Game Client** | `packages/client` | Responsible for graphics rendering, user input, and audio.<br>Features interpolation and UI systems. | Vite, **Pixi.js (WebGL)**, WebSocket |

---

## ⚡ Quick Start

### 📋 Prerequisites
* **Node.js:** v18.0.0 or higher
* **npm:** v7.0.0 or higher (Must support Workspaces)

### ⚙️ Installation Steps

1.  **Clone the Repository**

2.  **Install Dependencies** (Run at the project root)
    This will automatically install dependencies for client, server, and common packages.
    ```bash
    npm install
    ```

3.  **Configure Environment Variables (Important!)**
    Enter your local MySQL password in the following file:
    > File Path: `packages/server/.env`

---

## 🎮 Running the Game

Due to the **Monorepo** architecture, both the **Server** and **Client** must run simultaneously. Ensure you are in the project root directory (`voidworks/`).

### Option 1: One-Command Start (Recommended 🚀)
Use `concurrently` to launch both frontend and backend. Ideal for general development and gameplay.

```bash
npm run dev
```

* **Terminal Output:** You will see logs prefixed with `[SERVER]` (blue) and `[CLIENT]` (magenta) appear simultaneously.
* **Game URL:** Once launched, open [http://localhost:5173](https://www.google.com/search?q=http://localhost:5173) in your browser.

### Option 2: Separate Startup (For Debugging 🛠️)

If you wish to monitor logs separately, open two terminal windows:

**Terminal 1: Start Server**

```bash
npm run dev:server

```

> Server starts at `ws://localhost:8080` (Physics & Logic).

**Terminal 2: Start Client**

```bash
npm run dev:client

```

> Client starts at `http://localhost:5173` (Rendering & Input).

---

## 🕹️ Controls

| Key | Function |
| --- | --- |
| **W, A, S, D** | Move Character |
| **Mouse Cursor** | Aim / Shooting Direction |
| **Left Click** | Shoot / Mine Asteroids |
| **B** | Build Wall (Requires Stone) |
| **1 - 5** | Switch Hotbar Slots |

---

## 🌟 Current Features 

### ❤️ Survival System

* **Oxygen (O2):** Depletes over time. Health decreases when O2 hits zero.
* **Health (HP):** Decreases on damage or suffocation. Respawn on death.
* **UI:** Dynamic HP/O2 bars in the top-left corner.

### 🗺️ Procedural Map

* Infinite terrain generated using **Simplex Noise**.
* Contains clusters of walls and asteroids.

### ⛏️ Gathering & Building

* Mine **Copper Ore** and **Iron/Stone Asteroids**.
* Use gathered resources to build defensive walls.

### 🚀 High-Performance Synchronization

* Supports hundreds of concurrent entities (Optimized packet size).
* Binary transmission using **Protocol Buffers**.

---

## 🛠️ Development Workflow

### Modifying Communication Protocols (.proto)

If you modify `packages/common/protocol/voidworks.proto`, you must regenerate the JavaScript definition files.
> **⚠️ Important:** After modifying the Protocol, perform a **Hard Reload** in your browser. Otherwise, the client may use outdated definitions, causing decoding errors. And make sure you have modify `packages\client\public\protocol\voidworks.proto` too! 

### Collaboration Rules

* **Main Branch:** Maintains a stable, always-runnable state.
* **Feature Branch:** Create new branches for features (e.g., `feature/add-inventory-ui`).
* **Pull Request:** Submit a PR for code review upon completion.

---

## ❓ Troubleshooting

**Q1: Black screen (void) upon entering the game?**
> **A1:** Usually caused by the browser caching old `.proto` files.
> * Press `F12` to open DevTools.
> * Right-click the Refresh button.
> * Select **"Empty Cache and Hard Reload"**.

**Q2: Cannot see other players or asteroids?**
> **A2:** Check `maxPayloadLength` in `packages/server/src/Server.js` and ensure it is set to `1024 * 1024` (1MB) or higher.

**Q3: `npm run dev` error: command not found?**
> **A3:** Ensure you have run `npm install`. This automatically installs the required `concurrently` package.

**Q4: `[SERVER] Address already in use`?**
> **A4:** The server port (8080) is occupied. You likely have another server instance running in a different terminal. Close it first.

**Q5: Black screen (void) upon entering the game and see console has error due to UIManager?**
> **A1:** Go /voidworks
> * "rm -rf packages/client/node_modules/.vite" ,and then "npm run dev"
> * "npm run dew"
