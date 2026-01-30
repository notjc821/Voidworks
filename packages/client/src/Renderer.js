import * as PIXI from 'pixi.js';
import * as CommonPkg from '@voidworks/common';
import TextureManager from './TextureManager';
import UIManager from './UIManager';

const { Constants } = CommonPkg.default || CommonPkg;

class Renderer {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.mapOffsetX = 0;
    this.mapOffsetY = 0;
    
    // Initialize PIXI
    // Set backgroundColor to dark gray (0x101010) to distinguish the "background" from the "unrendered area".
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x101010, 
      antialias: false
    });
    document.body.appendChild(this.app.view);

    // --- Layers ---
    // Background -> World (Floor + Entities) -> UI
    this.backgroundContainer = new PIXI.Container();
    this.worldContainer = new PIXI.Container();
    this.uiContainer = new PIXI.Container();
    
    this.app.stage.addChild(this.backgroundContainer);
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.uiContainer);
    
    // World Sub-layers
    this.groundContainer = new PIXI.Container(); // ground (bottom layer)
    this.entityContainer = new PIXI.Container(); // entities (middle layer)
    this.previewContainer = new PIXI.Container(); // preview (top layer, e.g. ghost building)

    this.worldContainer.addChild(this.groundContainer);
    this.worldContainer.addChild(this.entityContainer);
    this.worldContainer.addChild(this.previewContainer);

    // Data caching
    this.sprites = new Map();
    this.uiElements = new Map();

    // Initialize background and ghosting
    this.initBackground();
    this.initGhostSprite();
    
    // Window scaling
    window.addEventListener('resize', () => {
      this.app.renderer.resize(window.innerWidth, window.innerHeight);
      if (this.tilingStars) {
        this.tilingStars.width = window.innerWidth;
        this.tilingStars.height = window.innerHeight;
      }
    });
  }

  // --- Core update loop (executed every frame) ---
  update(dt) {
    // 1. 實體平滑移動 (Interpolation)
    this.sprites.forEach((sprite, id) => {
        if (sprite.targetPos) {
            const smoothing = 0.2; //  0.1 ~ 0.3

            // 位置插值
            sprite.x += (sprite.targetPos.x - sprite.x) * smoothing;
            sprite.y += (sprite.targetPos.y - sprite.y) * smoothing;
            
            // 旋轉插值 (處理 360 度跳變)
            let targetRotation = sprite.targetPos.rotation;
            while (targetRotation - sprite.rotation > Math.PI) targetRotation -= Math.PI * 2;
            while (sprite.rotation - targetRotation > Math.PI) targetRotation += Math.PI * 2;
            sprite.rotation += (targetRotation - sprite.rotation) * smoothing;

            // [UI 綁定] 強制將 ID 標籤鎖定在平滑後的座標
            const ui = this.uiElements.get(id);
            if (ui) {
                ui.x = sprite.x;
                ui.y = sprite.y - 35; // 懸浮在頭頂
            }
        }
    });

    // 2. 攝影機跟隨玩家
    const myId = this.gameClient.myPlayerId;
    const playerSprite = this.sprites.get(myId);

    if (playerSprite) {
      const screenW = this.app.screen.width;
      const screenH = this.app.screen.height;
      
      // 移動世界容器，使玩家保持在螢幕中心
      this.worldContainer.position.set(
        screenW / 2 - playerSprite.x,
        screenH / 2 - playerSprite.y
      );

      // UI 與 預覽層 必須跟隨世界移動
      this.uiContainer.position.copyFrom(this.worldContainer.position);

      // 背景視差滾動 (速度較慢，營造深度感)
      if (this.tilingStars) {
          this.tilingStars.tilePosition.x = -playerSprite.x * 0.1;
          this.tilingStars.tilePosition.y = -playerSprite.y * 0.1;
      }

      // 3. 更新建造鬼影位置
      if (this.ghostSprite.visible) {
        const input = this.gameClient.input;
        const TILE = Constants.TILE_SIZE; // 32

        // 1. 取得滑鼠在「螢幕」上的點
        const globalMouse = new PIXI.Point(input.mouseScreenX, input.mouseScreenY);

        // 2. 將螢幕座標轉換為「遊戲世界 (worldContainer)」內的座標
        // 這會自動處理攝影機移動、縮放等所有問題
        const worldPos = this.worldContainer.toLocal(globalMouse);

        // 3. 網格索引計算 (Grid Index Calculation)
        // 因為地圖被往左上推了 mapOffsetX，所以我們要加回來才能算出它是第幾格
        // Math.floor 是關鍵，確保在格子的任何位置都選到同一格
        const col = Math.floor((worldPos.x + this.mapOffsetX) / TILE);
        const row = Math.floor((worldPos.y + this.mapOffsetY) / TILE);

        // 4. 轉回世界座標 (Snap to Center)
        // 公式：(格子索引 * 格子大小) - 地圖偏移 + 半格大小
        this.ghostSprite.x = (col * TILE) - this.mapOffsetX + (TILE / 2);
        this.ghostSprite.y = (row * TILE) - this.mapOffsetY + (TILE / 2);
      }
    }
  }

  // --- 網路同步邏輯 ---
  syncEntities(entities) {
    const activeIds = new Set();

    entities.forEach(data => {
      activeIds.add(data.id);
      let sprite = this.sprites.get(data.id);

      if (!sprite) {
        // [DEBUG] 輸出新實體資訊，方便除錯
        console.log(`[Renderer] New Entity: ${data.id} (${data.type}) at ${Math.round(data.x)},${Math.round(data.y)}`);
        
        sprite = this.createEntitySprite(data);
        
        // 初始化位置
        sprite.x = data.x;
        sprite.y = data.y;
        sprite.rotation = data.angle;
        
        // 初始化目標位置與數據引用
        sprite.targetPos = { x: data.x, y: data.y, rotation: data.angle };
        sprite.dataRef = data;

        this.entityContainer.addChild(sprite);
        this.sprites.set(data.id, sprite);

        // 如果是玩家，建立名字標籤
        if (data.type === Constants.Entities.PLAYER) {
            this.syncEntityUI(data);
        }
      } else {
        // 更新現有實體
        sprite.targetPos = { x: data.x, y: data.y, rotation: data.angle };
        sprite.dataRef = data; // 更新引用
        
        // [防護] 避免 maxHealth 為 0 導致 alpha = NaN (隱形)
        let alpha = 1;
        if (data.maxHealth > 0) {
            alpha = data.health / data.maxHealth;
        }
        // 確保至少有 0.1 的透明度，不然玩家會覺得是 Bug
        sprite.alpha = Math.max(0.1, alpha);
      }
    });

    // 清理消失的實體
    this.sprites.forEach((sprite, id) => {
      if (!activeIds.has(id)) {
        this.entityContainer.removeChild(sprite);
        sprite.destroy();
        this.sprites.delete(id);
        
        const ui = this.uiElements.get(id);
        if (ui) {
            this.uiContainer.removeChild(ui);
            ui.destroy();
            this.uiElements.delete(id);
        }
      }
    });
  }

  // 建立實體外觀
  createEntitySprite(data) {
    const container = new PIXI.Container();
    let textureKey = 'wall'; // 預設值
    let size = 32;

    // 根據類型選擇貼圖
    if (data.type === Constants.Entities.PLAYER) {
        textureKey = 'player';
        size = 32;
    } else if (data.type === Constants.Entities.ASTEROID_COPPER || data.type === Constants.Entities.ASTEROID_IRON) {
        textureKey = 'asteroid';
        size = 48; // 礦石大一點
    } else if (data.type === Constants.Entities.WALL) {
        textureKey = 'wall';
        size = 32;
    } else {
        textureKey = 'rock'; 
    }
    
    // [防護] 檢查貼圖是否存在
    const texture = TextureManager.get(textureKey);
    if (!texture) {
        console.warn(`[Renderer] Missing texture: ${textureKey}. Using fallback.`);
        // 缺圖時畫紅色方塊，避免隱形
        const g = new PIXI.Graphics();
        g.beginFill(0xFF0000);
        g.drawRect(-size/2, -size/2, size, size);
        container.addChild(g);
    } else {
        const sprite = new PIXI.Sprite(texture);
        sprite.width = size;
        sprite.height = size;
        sprite.anchor.set(0.5);
        container.addChild(sprite);
    }
    
    return container;
  }

  // --- 地圖初始化 (包含修正) ---
  initMap(mapData) {
    this.groundContainer.removeChildren();
    
    const { width, height, tiles } = mapData;
    
    // [修正] 計算中心偏移量
    // 伺服器座標是 (-size ~ +size)，所以中心是 (0,0)
    // PIXI 繪圖是從 (0,0) 開始往右下，所以要往回推一半
    this.mapOffsetX = (width / 2) * Constants.TILE_SIZE;
    this.mapOffsetY = (height / 2) * Constants.TILE_SIZE;

    console.log(`[Renderer] Drawing Map: ${width}x${height}, Offset: ${this.mapOffsetX}, ${this.mapOffsetY}`);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileId = tiles[y * width + x];
        
        if (tileId === Constants.Tiles.SPACE) continue;
        
        let textureName = 'rock'; 
        
        // [修正] 先建立 Sprite，再設定屬性
        const sprite = new PIXI.Sprite(TextureManager.get(textureName));
        
        // 根據類型微調外觀
        if (tileId === Constants.Tiles.WALL) {
             sprite.tint = 0x666666; // 牆壁下的地板變暗
        } else {
             sprite.tint = 0x888888;
        }
        
        // 設定位置 (應用偏移量)
        sprite.x = (x * Constants.TILE_SIZE) - this.mapOffsetX;
        sprite.y = (y * Constants.TILE_SIZE) - this.mapOffsetY;
        sprite.width = Constants.TILE_SIZE;
        sprite.height = Constants.TILE_SIZE;
        
        this.groundContainer.addChild(sprite);
      }
    }
  }

  // --- 其他輔助方法 ---

  initBackground() {
    // 程式化生成星空背景
    const starGraphics = new PIXI.Graphics();
    starGraphics.beginFill(0x000000);
    starGraphics.drawRect(0,0, 512, 512);
    starGraphics.beginFill(0xFFFFFF);
    for(let i=0; i<50; i++) {
        // 隨機畫小白點
        starGraphics.drawCircle(Math.random() * 512, Math.random() * 512, Math.random() * 2);
    }
    const starTexture = this.app.renderer.generateTexture(starGraphics);
    // TilingSprite 可以無限重複平鋪
    this.tilingStars = new PIXI.TilingSprite(starTexture, window.innerWidth, window.innerHeight);
    this.backgroundContainer.addChild(this.tilingStars);
  }

  initGhostSprite() {
    this.ghostSprite = new PIXI.Sprite(TextureManager.get('wall'));
    this.ghostSprite.alpha = 0.6; // 半透明
    this.ghostSprite.visible = false;
    this.ghostSprite.anchor.set(0.5);
    this.ghostSprite.width = Constants.TILE_SIZE;
    this.ghostSprite.height = Constants.TILE_SIZE;
    this.ghostSprite.tint = 0x00FF00; // 綠色
    this.previewContainer.addChild(this.ghostSprite);
  }

  syncEntityUI(data) {
    let ui = this.uiElements.get(data.id);
    if (!ui) {
        ui = new PIXI.Container();
        const style = new PIXI.TextStyle({
            fontFamily: 'Arial', fontSize: 14, fontWeight: 'bold',
            fill: '#ffffff', stroke: '#000000', strokeThickness: 4,
            align: 'center'
        });
        const text = new PIXI.Text(data.name || "Player", style);
        text.anchor.set(0.5, 1); // 文字底部對齊
        ui.addChild(text);
        
        this.uiContainer.addChild(ui);
        this.uiElements.set(data.id, ui);
        
        // 初始位置
        ui.x = data.x;
        ui.y = data.y - 35;
    }
  }

  setBuildMode(enabled, type) {
    this.ghostSprite.visible = enabled;
    if (enabled) {
        // 目前只有 wall 一種建築，未來可擴充
        this.ghostSprite.texture = TextureManager.get('wall');
    }
  }

  getMouseWorldPos(screenX, screenY) {
    // 將螢幕座標轉為 WorldContainer 的本地座標
    const globalPoint = new PIXI.Point(screenX, screenY);
    return this.worldContainer.toLocal(globalPoint);
  }
}

export default Renderer;