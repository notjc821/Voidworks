import * as PIXI from 'pixi.js';
import * as CommonPkg from '@voidworks/common';
import TextureManager from './TextureManager';
import UIManager from './UIManager';

const { Constants } = CommonPkg.default || CommonPkg;

class Renderer {
  constructor(gameClient) {
    this.gameClient = gameClient;
    
    // [修正 1] 設定全域縮放模式為 NEAREST (鄰近採樣)
    // 這會讓圖片放大時保持銳利的像素感，而不是模糊
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;

    // 初始化 PIXI 應用
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x000000,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true, // 配合 CSS 調整密度
    });
    document.body.appendChild(this.app.view);

    // [修正 2] 開啟 Round Pixels (整數座標)
    // 這會強制所有物件畫在整數座標上，消除因為小數點座標導致的縫隙與藍色雜點
    this.app.renderer.roundPixels = true;

    // 建立圖層
    this.worldContainer = new PIXI.Container();
    this.app.stage.addChild(this.worldContainer);

    this.groundContainer = new PIXI.Container(); 
    this.entityContainer = new PIXI.Container(); 
    this.previewContainer = new PIXI.Container(); 

    // 依序加入 (後加入的在上面)
    this.worldContainer.addChild(this.groundContainer);
    this.worldContainer.addChild(this.entityContainer);
    this.worldContainer.addChild(this.previewContainer);

    this.entities = new Map();
    
    // 初始化鬼影
    this.initGhost();

    // 畫面縮放處理
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      this.app.renderer.resize(w, h);
      
      // [新增] 通知背包管理器重新調整背景大小與位置
      if (this.gameClient.inventoryManager) {
          this.gameClient.inventoryManager.resize(w, h);
      }
    });
  }

  initGhost() {
    // 鬼影本體
    this.ghostSprite = new PIXI.Sprite(PIXI.Texture.WHITE); 
    this.ghostSprite.alpha = 0.5;
    this.ghostSprite.anchor.set(0.5);
    this.ghostSprite.visible = false;
    
    // [修正] 鬼影白框 (確保線條銳利)
    this.ghostBorder = new PIXI.Graphics();
    this.ghostBorder.visible = false;

    this.previewContainer.addChild(this.ghostSprite);
    this.previewContainer.addChild(this.ghostBorder);
  }

  setBuildMode(enabled, type) {
    this.ghostSprite.visible = enabled;
    this.ghostBorder.visible = enabled;
    
    if (enabled) {
        let texName = 'wall';
        if (type === Constants.Entities.WALL) texName = 'wall';
        
        const tex = TextureManager.get(texName);
        if (tex) {
            this.ghostSprite.texture = tex;
            this.ghostSprite.width = Constants.TILE_SIZE;
            this.ghostSprite.height = Constants.TILE_SIZE;
        }
    }
  }

  initMap(mapData) {
      this.groundContainer.removeChildren();
      
      const { width, height, tiles } = mapData;
      const TILE = Constants.TILE_SIZE;

      this.mapOffsetX = (width * TILE) / 2;
      this.mapOffsetY = (height * TILE) / 2;

      console.log(`[Renderer] Building Map: ${width}x${height} (Pixel Mode)`);

      for (let i = 0; i < tiles.length; i++) {
          const type = tiles[i];
          
          if (type === Constants.Tiles.FLOOR || type === Constants.Tiles.WALL) {
              const x = (i % width) * TILE - this.mapOffsetX;
              const y = Math.floor(i / width) * TILE - this.mapOffsetY;

              const sprite = new PIXI.Sprite(TextureManager.get('rock'));
              sprite.width = TILE;
              sprite.height = TILE;
              sprite.x = x + TILE / 2; 
              sprite.y = y + TILE / 2; 
              sprite.anchor.set(0.5);
              sprite.tint = 0x888888; 
              
              this.groundContainer.addChild(sprite);
          }
      }
  }

  syncEntities(serverEntities) {
    const serverIds = new Set();

    serverEntities.forEach(data => {
      serverIds.add(data.id);

      if (data.id === this.gameClient.myPlayerId) {
          UIManager.updateStats(data.health, data.maxHealth, data.oxygen, data.maxOxygen);
          UIManager.updateDebugInfo(data.x, data.y, data.id);
      }

      let sprite = this.entities.get(data.id);
      if (!sprite) {
        let texName = 'rock'; 
        if (data.type === Constants.Entities.PLAYER) texName = 'player';
        else if (data.type === Constants.Entities.WALL) texName = 'wall';
        else if (data.type === Constants.Entities.ASTEROID_COPPER) texName = 'asteroid';
        else if (data.type === Constants.Entities.ASTEROID_IRON) texName = 'asteroid';

        sprite = new PIXI.Sprite(TextureManager.get(texName));
        sprite.anchor.set(0.5);
        
        if (data.type === Constants.Entities.WALL) {
            sprite.width = Constants.TILE_SIZE;
            sprite.height = Constants.TILE_SIZE;
        } else if (data.type === Constants.Entities.PLAYER) {
            sprite.width = 40; sprite.height = 40;
        } else {
            sprite.width = 48; sprite.height = 48;
        }

        this.entities.set(data.id, sprite);
        this.entityContainer.addChild(sprite);
      }

      // 更新位置
      sprite.x = Math.round(data.x);
      sprite.y = Math.round(data.y);
      sprite.rotation = data.angle;
    });

    for (const [id, sprite] of this.entities) {
      if (!serverIds.has(id)) {
        this.entityContainer.removeChild(sprite);
        sprite.destroy();
        this.entities.delete(id);
      }
    }
  }

  update(dt) {
    const playerSprite = this.entities.get(this.gameClient.myPlayerId);
    if (playerSprite) {
      const screenW = this.app.screen.width;
      const screenH = this.app.screen.height;
      
      // 攝影機置中 (因為 roundPixels 開啟，這裡也會自動整數化)
      this.worldContainer.position.set(
        Math.round(screenW / 2 - playerSprite.x),
        Math.round(screenH / 2 - playerSprite.y)
      );

      // 鬼影邏輯
      if (this.ghostSprite.visible) {
        const input = this.gameClient.input;
        const TILE = Constants.TILE_SIZE;

        const globalMouse = new PIXI.Point(input.mouseScreenX, input.mouseScreenY);
        const worldPos = this.worldContainer.toLocal(globalMouse);

        const col = Math.floor((worldPos.x + this.mapOffsetX) / TILE);
        const row = Math.floor((worldPos.y + this.mapOffsetY) / TILE);

        const snappedX = (col * TILE) - this.mapOffsetX + (TILE / 2);
        const snappedY = (row * TILE) - this.mapOffsetY + (TILE / 2);

        this.ghostSprite.x = snappedX;
        this.ghostSprite.y = snappedY;
        
        this.ghostBorder.x = snappedX;
        this.ghostBorder.y = snappedY;

        const dx = snappedX - playerSprite.x;
        const dy = snappedY - playerSprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const MAX_DIST = Constants.BUILD_DISTANCE || 200;

        this.ghostBorder.clear(); 

        if (dist <= MAX_DIST) {
            this.isValidBuild = true;
            this.ghostSprite.tint = 0xFFFFFF; 
            
            this.ghostBorder.lineStyle(2, 0xFFFFFF, 1); 
            // 因為是整數渲染，這裡的偏移會更準確
            this.ghostBorder.drawRect(-TILE/2, -TILE/2, TILE, TILE);
        } else {
            this.isValidBuild = false;
            this.ghostSprite.tint = 0xFF0000; 
        }
      }
    }
  }
}

export default Renderer;