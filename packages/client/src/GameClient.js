import * as CommonPkg from '@voidworks/common';
import Renderer from './Renderer';
import UIManager from './UIManager';
import AudioManager from './AudioManager';
import TextureManager from './TextureManager';
import InventoryManager from './InventoryManager'; // [重要] 引入背包管理器

// 處理 Monorepo 的 Common 包引用
const { Constants, Protocol } = CommonPkg.default || CommonPkg;

class GameClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.myPlayerId = null;

    // 輸入狀態
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      mouseAngle: 0,
      mouseScreenX: 0,
      mouseScreenY: 0,
      isShooting: false
    };

    // 建造模式狀態
    this.buildMode = false;
    this.selectedBuildType = Constants.Entities.WALL; 

    this.lastTime = 0;
  }

  async init() {
    console.log("[Client] System starting...");

    // 1. 載入資源 (協議/圖片/音效)
    // 注意：根據你的 Protocol 實作，如果需要 load 就保留，不需要則移除
    if (Protocol.load) await Protocol.load(); 
    await TextureManager.load();
    await AudioManager.load();

    console.log("[Client] Resources loaded.");

    // 2. 初始化渲染器
    this.renderer = new Renderer(this);

    // 3. 初始化背包管理器 (傳入 PIXI app 和 GameClient)
    this.inventoryManager = new InventoryManager(this.renderer.app, this);

    // 4. 設定輸入監聽
    this.setupInput();

    // 5. 連線伺服器
    this.connect();

    // 6. 啟動客戶端遊戲迴圈
    this.lastTime = performance.now();
    this.loop();
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname;
    const port = Constants.DEFAULT_PORT || 8080;
    const url = `${protocol}://${host}:${port}`;

    console.log(`[Client] Connecting to ${url}...`);
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      console.log("[Client] WebSocket Connected!");
      this.connected = true;
      
      // 發送握手
      const buffer = Protocol.encodeClientPacket({ handshake: { name: "Player" } });
      this.ws.send(buffer);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = () => {
      console.log("[Client] Disconnected.");
      this.connected = false;
    };
  }

  handleMessage(buffer) {
    try {
      const uint8Buffer = new Uint8Array(buffer);
      const message = Protocol.decodeServerPacket(uint8Buffer);
      
      if (message.packet === 'welcome') {
        console.log(`[Client] Joined Game. My ID: ${message.welcome.playerId}`);
        this.myPlayerId = message.welcome.playerId;
      }
      else if (message.packet === 'mapData') {
        console.log(`[Client] Map Data: ${message.mapData.width}x${message.mapData.height}`);
        this.renderer.initMap(message.mapData);
      }
      else if (message.packet === 'worldState') {
        // 確認 renderer 存在才更新 (避免還沒 init 完成就收到封包)
        if (this.renderer) {
            this.renderer.syncEntities(message.worldState.entities);
        }
      }
      else if (message.packet === 'inventory') {
        console.log(`[Client] Inventory Updated`);
        // 更新快捷列 UI
        if (UIManager) UIManager.updateInventory(message.inventory.items);
        // 更新背包視窗內容
        if (this.inventoryManager) this.inventoryManager.updateInventory(message.inventory.items);
        // 播放音效
        AudioManager.play('hit'); 
      }

    } catch (e) {
      console.error("[Client] Decode error:", e);
    }
  }

  setupInput() {
    // 鍵盤按下
    document.addEventListener('keydown', (e) => {
      // [Phase 11] 按 E 切換背包開關
      if (e.code === 'KeyE') {
          this.inventoryManager.toggle();
          // 如果打開背包，自動關閉建造模式
          if (this.inventoryManager.isOpen) {
              this.buildMode = false;
              this.renderer.setBuildMode(false);
          }
          return;
      }

      // 只有在背包關閉時，才允許其他操作
      if (!this.inventoryManager.isOpen) {
        if (e.code === 'KeyW') this.input.up = true;
        if (e.code === 'KeyS') this.input.down = true;
        if (e.code === 'KeyA') this.input.left = true;
        if (e.code === 'KeyD') this.input.right = true;
        
        // B 鍵：切換建造模式
        if (e.code === 'KeyB') {
          this.buildMode = !this.buildMode;
          this.renderer.setBuildMode(this.buildMode, this.selectedBuildType);
          AudioManager.play('build'); 
        }

        // 數字鍵：切換物品 (暫時範例)
        if (e.key === '1') this.selectedBuildType = Constants.Entities.WALL;
      }
    });

    // 鍵盤放開
    document.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW') this.input.up = false;
      if (e.code === 'KeyS') this.input.down = false;
      if (e.code === 'KeyA') this.input.left = false;
      if (e.code === 'KeyD') this.input.right = false;
    });

    // 滑鼠移動
    document.addEventListener('mousemove', (e) => {
      this.input.mouseScreenX = e.clientX;
      this.input.mouseScreenY = e.clientY;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      this.input.mouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    });

    // 滑鼠點擊
    document.addEventListener('mousedown', (e) => {
      // 確保音效引擎啟動
      if (AudioManager.resume) AudioManager.resume();

      if (this.inventoryManager.isOpen) return; // 背包打開時不處理

      if (e.button === 0) { // 左鍵
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

    // 如果背包打開中，強制傳送靜止訊號
    if (this.inventoryManager.isOpen) {
        const idleInput = {
            up: false, down: false, left: false, right: false,
            mouseAngle: this.input.mouseAngle,
            isShooting: false
        };
        const buffer = Protocol.encodeClientPacket({ input: idleInput });
        this.ws.send(buffer);
        return;
    }

    const buffer = Protocol.encodeClientPacket({ input: this.input });
    this.ws.send(buffer);
  }

  // [修正] 建造請求：使用鬼影座標確保對齊
  sendBuildRequest() {
    if (!this.connected) return;
    
    // 使用 Renderer 算出來的精準鬼影座標
    const ghost = this.renderer.ghostSprite;
    
    // 如果鬼影沒顯示，或者 Renderer 標記為不合法 (太遠)，就不發送
    if (!ghost || !ghost.visible || this.renderer.isValidBuild === false) return;

    const buffer = Protocol.encodeClientPacket({
      build: {
        type: this.selectedBuildType,
        x: ghost.x, // 這裡確保了是 "格子中心"
        y: ghost.y, // 這裡確保了是 "格子中心"
        angle: 0
      }
    });
    this.ws.send(buffer);
  }

  // 發送合成請求
  sendCraftRequest(recipeId) {
    if (!this.connected) return;
    
    console.log(`[Client] Sending Craft Request: Recipe #${recipeId}`);
    const buffer = Protocol.encodeClientPacket({ 
        craft: { recipeId } 
    });
    this.ws.send(buffer);
  }

  loop() {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (this.renderer) {
      this.renderer.update(dt);
    }

    // 持續發送輸入 (每幀)
    this.sendInput();

    requestAnimationFrame(() => this.loop());
  }
}

export default GameClient;