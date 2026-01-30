import * as CommonPkg from '@voidworks/common';
const { Protocol, Constants } = CommonPkg.default || CommonPkg;

import Renderer from './Renderer';
import InputController from './InputController';
import TextureManager from './TextureManager';
import UIManager from './UIManager';
import AudioManager from './AudioManager'; // [NEW]

class GameClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.myPlayerId = null;
    this.renderer = new Renderer(this);
    this.input = new InputController(this);
    this.lastUpdate = Date.now();
  }

  async start() {
    console.log("[Client] System starting...");
    
    try {
      await Protocol.load();
      console.log("[Client] Protocols loaded.");

      await TextureManager.load();
      console.log("[Client] Textures loaded.");

      // [NEW] 載入音效
      AudioManager.load();
      console.log("[Client] Audio initialized.");

      this.connect();
      this.gameLoop();

    } catch (err) {
      console.error("[Client] Startup failed:", err);
      const debugEl = document.getElementById('stats-panel');
      if (debugEl) debugEl.innerHTML += `<br><span style="color:red">Error: ${err.message}</span>`;
    }
  }

  connect() {
    this.ws = new WebSocket(`ws://${window.location.hostname}:8080`);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      console.log("[Client] WebSocket Connected!");
      this.isConnected = true;
      this.sendHandshake();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(new Uint8Array(event.data));
    };

    this.ws.onclose = () => {
      console.log("[Client] Disconnected");
      this.isConnected = false;
    };
    
    this.ws.onerror = (err) => { console.error(err); };
  }

  send(buffer) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(buffer);
    }
  }

  sendHandshake() {
    const packet = Protocol.encodeClientPacket({
      handshake: { name: "Player_" + Math.floor(Math.random() * 1000) }
    });
    this.send(packet);
  }

  handleMessage(buffer) {
    try {
      const message = Protocol.decodeServerPacket(buffer);
      
      if (message.packet === 'welcome') {
        console.log(`[Client] Packet Received: WELCOME (My ID: ${message.welcome.playerId})`);
        this.myPlayerId = message.welcome.playerId;
      }
      else if (message.packet === 'mapData') {
        console.log(`[Client] Packet Received: MAP_DATA (Size: ${message.mapData.width}x${message.mapData.height})`);
        this.renderer.initMap(message.mapData);
      }
      else if (message.packet === 'inventory') {
        console.log(`[Client] Packet Received: INVENTORY`);
        UIManager.updateInventory(message.inventory.items);
        AudioManager.play('hit');
      }
      else if (message.packet === 'worldState') {
        const entityCount = message.worldState.entities ? message.worldState.entities.length : 0;
        
        if (Math.random() < 0.02) {
            console.log(`[Client] Packet Received: WORLD_STATE (Entities: ${entityCount})`);
        }

        this.renderer.syncEntities(message.worldState.entities);
      }

    } catch (e) {
      console.error("[Client] Decode error:", e);
    }
  }

  gameLoop() {
    requestAnimationFrame(() => this.gameLoop());
    const now = Date.now();
    const dt = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;
    this.renderer.update(dt);
  }
}

export default GameClient;