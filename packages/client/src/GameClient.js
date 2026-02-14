import * as PIXI from 'pixi.js';
import * as CommonPkg from '@voidworks/common';
import Renderer from './Renderer';
import InputController from './InputController';
import InventoryManager from './InventoryManager';
import AudioManager from './AudioManager';
import UIManager from './UIManager'; 
import TextureManager from './TextureManager';

// 處理 CommonJS/ESM 兼容性
const { Protocol, Constants } = CommonPkg.default || CommonPkg;

class GameClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.myPlayerId = null;

    this.input = {
      up: false, down: false, left: false, right: false,
      mouseAngle: 0,
      mouseScreenX: 0,
      mouseScreenY: 0,
      isShooting: false,
      selectedSlot: 0 
    };

    this.buildMode = false;
    this.selectedBuildType = Constants.Entities.WALL; 
    this.lastTime = 0;

    this.loadedChunks = new Set();
    this.currentChunkX = null;
    this.currentChunkY = null;
  }

  async init() {
    console.log('[Client] System starting...');

    // [修正] 1. 最優先載入 Protocol，否則無法通訊
    try {
        await Protocol.load();
        console.log('[Client] Protocol loaded.');
    } catch (e) {
        console.error('[Client] FATAL: Failed to load protocol:', e);
        alert('Failed to load game protocol. Check console.');
        return;
    }
    
    // 2. 初始化渲染器與介面
    this.renderer = new Renderer(this);
    
    // 3. 初始化背包 (需等待 PIXI 初始化完成)
    this.inventoryManager = InventoryManager; 
    await this.inventoryManager.init(this);
    
    // 4. 載入素材與音效
    await AudioManager.load();
    // 這裡通常還會有 TextureManager.load()，建議補上
    await TextureManager.load(); 
    
    this.setupInput();
    
    console.log('[Client] Resources loaded. Connecting...');
    this.connect();
    
    this.loop();
  }

  connect() {
    if (this.connected) return;
    
    const port = (Constants.Network && Constants.Network.DEFAULT_PORT) || Constants.DEFAULT_PORT || 8080;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname;
    const url = `${protocol}://${host}:${port}`;
    
    console.log(`[Client] Connecting to ${url}...`);
    
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';
    
    this.ws.onopen = () => {
      console.log('[Client] WebSocket Connected!');
      this.connected = true;
      // Protocol 現在已經載入完成，可以安全發送了
      const handshake = { handshake: { name: `Player_${Math.floor(Math.random()*1000)}` } };
      this.ws.send(Protocol.encodeClientPacket(handshake));
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = () => {
      console.log('[Client] Disconnected.');
      this.connected = false;
      setTimeout(() => this.connect(), 3000);
    };
    
    this.ws.onerror = (err) => {
        console.error('[Client] Socket error:', err);
    };
  }

  // ... (handleMessage, checkChunkUpdate, requestSurroundingChunks, sendChunkRequest 等方法保持不變) ...
  // 請確保不要把這些方法刪掉了，只需替換上面的 init 與 connect 即可，或保留原樣
  
  handleMessage(data) {
    try {
      const buffer = new Uint8Array(data);
      const msg = Protocol.decodeServerPacket(buffer);

      if (msg.welcome) {
        this.myPlayerId = msg.welcome.playerId;
        console.log(`[Client] Joined as ${this.myPlayerId}`);
      } 
      else if (msg.chunkData) {
        this.renderer.updateChunk(msg.chunkData);
      }
      else if (msg.worldState) {
        this.renderer.syncEntities(msg.worldState.entities);
        this.checkChunkUpdate();
      } 
      else if (msg.inventory) {
        if (this.inventoryManager) {
            this.inventoryManager.updateInventory(msg.inventory.items);
        }
        if (UIManager) {
            UIManager.updateInventory(msg.inventory.items);
        }
      }
    } catch (e) {
      console.error('[Client] Decode error:', e);
    }
  }

  checkChunkUpdate() {
      const playerSprite = this.renderer.entities.get(this.myPlayerId);
      if (!playerSprite) return;

      const TILE = Constants.World.TILE_SIZE;
      const CHUNK = Constants.World.CHUNK_SIZE || 32;
      const fullSize = TILE * CHUNK;

      const cx = Math.floor(playerSprite.x / fullSize);
      const cy = Math.floor(playerSprite.y / fullSize);

      if (cx !== this.currentChunkX || cy !== this.currentChunkY) {
          this.currentChunkX = cx;
          this.currentChunkY = cy;
          this.requestSurroundingChunks(cx, cy);
          
          this.unloadDistantChunks(cx, cy);
      }
  }

  requestSurroundingChunks(cx, cy) {
      const radius = 1; 
      for (let y = cy - radius; y <= cy + radius; y++) {
          for (let x = cx - radius; x <= cx + radius; x++) {
              const key = `${x},${y}`;
              if (!this.loadedChunks.has(key)) {
                  this.sendChunkRequest(x, y);
                  this.loadedChunks.add(key);
              }
          }
      }
  }

  unloadDistantChunks(cx, cy) {
      const UNLOAD_DIST = 3; 
      
      for (const key of Array.from(this.loadedChunks)) {
          const [xStr, yStr] = key.split(',');
          const chunkX = parseInt(xStr);
          const chunkY = parseInt(yStr);
          
          const dx = Math.abs(chunkX - cx);
          const dy = Math.abs(chunkY - cy);
          
          if (dx > UNLOAD_DIST || dy > UNLOAD_DIST) {
              this.loadedChunks.delete(key);
              this.renderer.removeChunk(key);
          }
      }
  }

  sendChunkRequest(cx, cy) {
      if (!this.connected) return;
      const packet = {
          requestChunk: {
              chunkX: cx,
              chunkY: cy
          }
      };
      this.ws.send(Protocol.encodeClientPacket(packet));
  }

  setupInput() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE') {
          this.inventoryManager.toggle();
          if (this.inventoryManager.isOpen) {
              this.buildMode = false;
              this.renderer.setBuildMode(false);
          }
          return;
      }

      if (e.key >= '1' && e.key <= '9') {
          const slotIndex = parseInt(e.key) - 1;
          this.input.selectedSlot = slotIndex;
          if (UIManager) UIManager.selectSlot(slotIndex);
      }

      if (!this.inventoryManager.isOpen) {
        if (e.code === 'KeyW') this.input.up = true;
        if (e.code === 'KeyS') this.input.down = true;
        if (e.code === 'KeyA') this.input.left = true;
        if (e.code === 'KeyD') this.input.right = true;
        
        if (e.code === 'KeyB') {
          this.buildMode = !this.buildMode;
          this.renderer.setBuildMode(this.buildMode, Constants.Entities.WALL);
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW') this.input.up = false;
      if (e.code === 'KeyS') this.input.down = false;
      if (e.code === 'KeyA') this.input.left = false;
      if (e.code === 'KeyD') this.input.right = false;
    });

    document.addEventListener('mousemove', (e) => {
      this.input.mouseScreenX = e.clientX;
      this.input.mouseScreenY = e.clientY;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      this.input.mouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    });

    document.addEventListener('mousedown', (e) => {
      if (AudioManager.resume) AudioManager.resume();
      if (this.inventoryManager.isOpen) return;

      if (e.button === 0) { 
        if (this.buildMode) {
            this.sendBuildRequest();
        } else {
            this.input.isShooting = true;
        }
      }
    });

    document.addEventListener('mouseup', () => {
      this.input.isShooting = false;
    });
  }

  sendInput() {
    if (!this.connected) return;
    if (this.inventoryManager.isOpen) {
        const idleInput = {
            up: false, down: false, left: false, right: false,
            mouseAngle: this.input.mouseAngle,
            isShooting: false,
            selectedSlot: this.input.selectedSlot
        };
        const buffer = Protocol.encodeClientPacket({ input: idleInput });
        this.ws.send(buffer);
        return;
    }
    const buffer = Protocol.encodeClientPacket({ input: this.input });
    this.ws.send(buffer);
  }

  sendBuildRequest() {
      if (!this.renderer.isValidBuild) return;
      
      const input = this.input;
      const mouseX = input.mouseScreenX;
      const mouseY = input.mouseScreenY;
      
      const worldPos = this.renderer.toWorldCoords(mouseX, mouseY);
      
      const packet = {
          build: {
              type: this.selectedBuildType,
              x: worldPos.x,
              y: worldPos.y,
              angle: 0
          }
      };
      this.ws.send(Protocol.encodeClientPacket(packet));
      AudioManager.play('build');
  }

  sendCraftRequest(recipeId) {
      if (!this.connected) return;
      const packet = { craft: { recipeId } };
      this.ws.send(Protocol.encodeClientPacket(packet));
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    
    const now = Date.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.sendInput();
    this.renderer.update(dt);
  }
}

export default GameClient;