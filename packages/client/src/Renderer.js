import * as PIXI from 'pixi.js';
import * as CommonPkg from '@voidworks/common';
import TextureManager from './TextureManager';
import UIManager from './UIManager';

const { Constants } = CommonPkg.default || CommonPkg;

class Renderer {
  constructor(gameClient) {
    this.gameClient = gameClient;
    
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x000000, 
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    document.body.appendChild(this.app.view);
    this.app.renderer.roundPixels = true;

    this.worldContainer = new PIXI.Container();
    this.app.stage.addChild(this.worldContainer);

    this.groundContainer = new PIXI.Container();
    this.entityContainer = new PIXI.Container();
    this.previewContainer = new PIXI.Container(); 

    this.worldContainer.addChild(this.groundContainer);
    this.worldContainer.addChild(this.entityContainer);
    this.worldContainer.addChild(this.previewContainer);

    this.entities = new Map();
    this.renderedChunks = new Map(); 
    
    this.initGhost();

    window.addEventListener('resize', () => {
      this.app.renderer.resize(window.innerWidth, window.innerHeight);
      if (this.gameClient.inventoryManager) {
          this.gameClient.inventoryManager.resize(window.innerWidth, window.innerHeight);
      }
    });

    this.isValidBuild = false;
  }

  updateChunk(chunkData) {
      const { chunkX, chunkY, tiles } = chunkData;
      const key = `${chunkX},${chunkY}`;

      this.removeChunk(key);

      if (this.renderedChunks.has(key)) {
          const oldContainer = this.renderedChunks.get(key);
          this.groundContainer.removeChild(oldContainer);
          oldContainer.destroy({ children: true });
      }

      const chunkContainer = new PIXI.Container();
      const TILE = Constants.World.TILE_SIZE;
      const CHUNK_SIZE = Constants.World.CHUNK_SIZE || 32;

      const startX = chunkX * CHUNK_SIZE * TILE;
      const startY = chunkY * CHUNK_SIZE * TILE;

      chunkContainer.x = startX;
      chunkContainer.y = startY;

      for (let i = 0; i < tiles.length; i++) {
          const type = tiles[i];
          
          if (type !== Constants.Tiles.SPACE) {
              const x = (i % CHUNK_SIZE) * TILE;
              const y = Math.floor(i / CHUNK_SIZE) * TILE;

              let texName = 'Stone'; 
              if (type === Constants.Tiles.FLOOR) texName = 'Stone'; 
              else if (type === Constants.Tiles.WALL) texName = 'wall';
              else if (type === Constants.Entities.STONE) texName = 'Stone';

              const sprite = new PIXI.Sprite(TextureManager.get(texName));
              
              // [自動調整] 強制填滿格子
              sprite.width = TILE;
              sprite.height = TILE;
              
              sprite.x = x + TILE / 2;
              sprite.y = y + TILE / 2;
              sprite.anchor.set(0.5);
              
              // [修正] 移除 tint，確保地板顏色正確
              // sprite.tint = 0x888888; 

              chunkContainer.addChild(sprite);
          }
      }

      this.groundContainer.addChild(chunkContainer);
      this.renderedChunks.set(key, chunkContainer);
  }

  removeChunk(key) {
      if (this.renderedChunks.has(key)) {
          const container = this.renderedChunks.get(key);
          this.groundContainer.removeChild(container);
          // destroy({ children: true }) 會連同內部的 Sprite 一起銷毀
          // 但不會銷毀 Texture (這是正確的，因為 Texture 是共用的)
          container.destroy({ children: true });
          this.renderedChunks.delete(key);
          // console.log(`[Renderer] Unloaded chunk: ${key}`);
      }
  }

  toWorldCoords(screenX, screenY) {
      const worldPos = this.worldContainer.toLocal(new PIXI.Point(screenX, screenY));
      return { x: worldPos.x, y: worldPos.y };
  }

  syncEntities(serverEntities) {
    const serverIds = new Set();

    serverEntities.forEach(data => {
      serverIds.add(data.id);

      if (data.id === this.gameClient.myPlayerId) {
          UIManager.updateStats(data.health, data.maxHealth, data.oxygen, data.maxOxygen);
          UIManager.updateDebugInfo(data.x, data.y, data.id);
      }

      let visual = this.entities.get(data.id);
      
      if (!visual) {
        if (data.type === Constants.Entities.PLAYER) {
            visual = new PIXI.Container();
            const body = new PIXI.Sprite(TextureManager.get('player_body'));
            body.anchor.set(0.5);
            body.width = 40; body.height = 40;
            visual.addChild(body);

            const hands = new PIXI.Sprite(TextureManager.get('player_hands'));
            hands.anchor.set(0.5);
            hands.width = 40; hands.height = 40;
            visual.addChild(hands);
        } else {
            const blockInfo = Constants.BlockRegistry[data.type];
            let texName = blockInfo ? blockInfo.texture : 'Stone';
            if (data.type === Constants.Entities.WALL) texName = 'wall';

            visual = new PIXI.Sprite(TextureManager.get(texName));
            visual.anchor.set(0.5);
            
            // [自動調整] 實體強制縮放至 32x32
            visual.width = Constants.World.TILE_SIZE;
            visual.height = Constants.World.TILE_SIZE;
        }
        this.entities.set(data.id, visual);
        this.entityContainer.addChild(visual);
      }

      visual.x = Math.round(data.x);
      visual.y = Math.round(data.y);
      visual.rotation = data.angle;
    });

    for (const [id, visual] of this.entities) {
      if (!serverIds.has(id)) {
        this.entityContainer.removeChild(visual);
        visual.destroy({ children: true });
        this.entities.delete(id);
      }
    }
  }

  initGhost() {
    this.ghostSprite = new PIXI.Sprite(PIXI.Texture.WHITE); 
    this.ghostSprite.alpha = 0.5;
    this.ghostSprite.anchor.set(0.5);
    this.ghostSprite.visible = false;
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
        const tex = TextureManager.get(texName);
        if (tex) {
            this.ghostSprite.texture = tex;
            this.ghostSprite.width = Constants.World.TILE_SIZE;
            this.ghostSprite.height = Constants.World.TILE_SIZE;
        }
    }
  }

  update(dt) {
    const playerSprite = this.entities.get(this.gameClient.myPlayerId);
    if (playerSprite) {
      const screenW = this.app.screen.width;
      const screenH = this.app.screen.height;
      
      this.worldContainer.position.set(
        Math.round(screenW / 2 - playerSprite.x),
        Math.round(screenH / 2 - playerSprite.y)
      );

      if (this.ghostSprite.visible) {
        const input = this.gameClient.input;
        const TILE = Constants.World.TILE_SIZE;

        const globalMouse = new PIXI.Point(input.mouseScreenX, input.mouseScreenY);
        const worldPos = this.worldContainer.toLocal(globalMouse);

        const col = Math.floor(worldPos.x / TILE);
        const row = Math.floor(worldPos.y / TILE);

        const snappedX = col * TILE + TILE / 2;
        const snappedY = row * TILE + TILE / 2;

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