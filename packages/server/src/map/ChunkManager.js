const { createNoise2D } = require('simplex-noise');
const { Constants } = require('@voidworks/common');
const Wall = require('../entities/Wall');
const Asteroid = require('../entities/Asteroid');

class ChunkManager {
  constructor(game) {
    this.game = game;
    this.chunks = new Map(); // Key: "x,y", Value: ChunkData
    this.noise2D = createNoise2D(); 
    this.chunkSize = Constants.World.CHUNK_SIZE || 32;
  }

  getKey(cx, cy) {
    return `${cx},${cy}`;
  }

  getChunk(cx, cy) {
    const key = this.getKey(cx, cy);
    if (this.chunks.has(key)) {
      return this.chunks.get(key);
    }
    return this.generateChunk(cx, cy);
  }

  // [新功能] 偽隨機亂數：確保同一個位置永遠生成同樣的東西
  pseudoRandom(x, y) {
      const sin = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      return sin - Math.floor(sin);
  }

  generateChunk(cx, cy) {
    // console.log(`[ChunkManager] Generating Chunk: ${cx}, ${cy}`);
    
    const tiles = [];
    const entityIds = []; // [關鍵] 記錄屬於這個區塊的實體 ID
    
    const size = this.chunkSize;
    const TILE_SIZE = Constants.World.TILE_SIZE;
    const HALF_TILE = TILE_SIZE / 2;
    
    const worldOffsetX = cx * size;
    const worldOffsetY = cy * size;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const wx = worldOffsetX + x;
        const wy = worldOffsetY + y;

        // 地形雜訊
        const noiseValue = this.noise2D(wx * 0.1, wy * 0.1);
        // 使用座標當種子的亂數 (0~1)
        const rand = this.pseudoRandom(wx, wy); 
        
        let tileType = Constants.Tiles.SPACE; 

        // 1. 基礎基岩
        if (noiseValue > 0.4) {
            tileType = Constants.Entities.STONE; 
            
            // 10% 機率生成牆壁
            if (rand < 0.1) {
                const entityX = wx * TILE_SIZE + HALF_TILE;
                const entityY = wy * TILE_SIZE + HALF_TILE;
                
                const wall = new Wall(this.game.generateId(), entityX, entityY);
                this.game.createEntity(wall);
                
                tileType = Constants.Tiles.WALL; 
                entityIds.push(wall.id); // [關鍵] 記錄 ID
            }
        } 
        
        // 2. 礦石生成
        else if (noiseValue > 0.3 && rand < 0.05) {
            const entityX = wx * TILE_SIZE + HALF_TILE;
            const entityY = wy * TILE_SIZE + HALF_TILE;
            
            // 決定礦石種類 (使用另一個參數當亂數種子避免重複)
            const oreRand = this.pseudoRandom(wx + 1000, wy + 1000);
            let oreType = Constants.Entities.COPPER_ORE;
            if (oreRand > 0.95) oreType = Constants.Entities.TITANIUM_ORE;
            else if (oreRand > 0.8) oreType = Constants.Entities.GOLD_ORE;
            else if (oreRand > 0.6) oreType = Constants.Entities.IRON_ORE;

            const asteroid = new Asteroid(this.game.generateId(), entityX, entityY, oreType);
            this.game.createEntity(asteroid);
            
            entityIds.push(asteroid.id); // [關鍵] 記錄 ID
        }

        // 3. 地板
        else if (noiseValue > -0.2) {
             tileType = Constants.Tiles.FLOOR; 
        }

        tiles.push(tileType);
      }
    }

    const chunkData = {
      x: cx,
      y: cy,
      tiles: tiles,
      entityIds: entityIds // 將實體清單存入區塊資料
    };

    this.chunks.set(this.getKey(cx, cy), chunkData);
    return chunkData;
  }

  updatePlayerChunks(player) {
      const px = player.body.position[0];
      const py = player.body.position[1];
      const TILE = Constants.World.TILE_SIZE;
      const CHUNK = this.chunkSize;
      
      const cx = Math.floor(px / (TILE * CHUNK));
      const cy = Math.floor(py / (TILE * CHUNK));

      const radius = 1; 
      for (let y = cy - radius; y <= cy + radius; y++) {
          for (let x = cx - radius; x <= cx + radius; x++) {
              this.getChunk(x, y); 
          }
      }
  }

  // [修復] 徹底卸載：同時移除區塊資料與實體
  cleanupChunks() {
      const UNLOAD_DIST = 5; 
      
      for (const [key, chunk] of this.chunks.entries()) {
          let keep = false;
          
          for (const player of this.game.players.values()) {
             const TILE = Constants.World.TILE_SIZE;
             const CHUNK = this.chunkSize;
             const pcx = Math.floor(player.body.position[0] / (TILE * CHUNK));
             const pcy = Math.floor(player.body.position[1] / (TILE * CHUNK));
             
             const dist = Math.max(Math.abs(chunk.x - pcx), Math.abs(chunk.y - pcy));
             if (dist <= UNLOAD_DIST) {
                 keep = true;
                 break;
             }
          }
          
          if (!keep) {
              // [關鍵] 移除該區塊內的所有實體
              if (chunk.entityIds) {
                  chunk.entityIds.forEach(id => {
                      this.game.removeEntity(id);
                  });
              }
              
              this.chunks.delete(key);
              // console.log(`[ChunkManager] Unloaded Chunk: ${key} (Entities: ${chunk.entityIds.length})`);
          }
      }
  }
}

module.exports = ChunkManager;