const { createNoise2D } = require('simplex-noise');
const Constants = require('../../../common/Constants'); 
const Wall = require('../entities/Wall'); 
const Asteroid = require('../entities/Asteroid');

class WorldGenerator {
  constructor(game) {
    this.game = game;
    this.noise2D = createNoise2D(); // 建立 2D 雜訊函數
  }

  generate(size) {
    console.log(`[WorldGen] Generating world of size ${size}x${size}...`);
    
    const tileSize = Constants.TILE_SIZE;
    
    // 初始化地圖數據 (給客戶端渲染地板用)
    // 我們掃描範圍是 -size 到 size，所以寬高是 size * 2
    const width = size * 2;
    const height = size * 2;
    const tiles = new Array(width * height).fill(Constants.Tiles.FLOOR);

    // 遍歷所有座標
    for (let y = -size; y < size; y++) {
      for (let x = -size; x < size; x++) {
        const worldX = x * tileSize;
        const worldY = y * tileSize;

        // 1. 生成邊界牆 (Bedrock Wall) - 防止玩家跑出地圖
        if (x === -size || x === size - 1 || y === -size || y === size - 1) {
            this.createWall(worldX, worldY);
            this.setTile(tiles, x, y, size, Constants.Tiles.WALL);
            continue;
        }

        // 2. 核心區保護 (Spawn Area) - 出生點附近 5 格不生成障礙物
        if (Math.abs(x) < 5 && Math.abs(y) < 5) {
            continue;
        }

        // 3. 雜訊生成邏輯
        // frequency: 縮放比例，越小地形越平緩，越大越破碎
        const frequency = 0.1; 
        const noiseValue = this.noise2D(x * frequency, y * frequency);

        // noiseValue 範圍通常在 -1 到 1 之間
        
        // > 0.6 生成牆壁 (像山脈)
        if (noiseValue > 0.6) {
            this.createWall(worldX, worldY);
            // 標記 TileMap，雖然客戶端主要是看 Entity，但 TileMap 可用於小地圖或優化
            this.setTile(tiles, x, y, size, Constants.Tiles.WALL);
        } 
        // < -0.6 生成礦石 (像礦脈)
        else if (noiseValue < -0.6) {
            // 隨機決定銅礦或鐵礦
            const type = Math.random() > 0.6 ? Constants.Entities.ASTEROID_COPPER : Constants.Entities.ASTEROID_IRON;
            this.createAsteroid(worldX, worldY, type);
        }
        // 其他範圍則是地板 (Space/Floor)
      }
    }

    return {
        width: width,
        height: height,
        tiles: tiles
    };
  }

  // 輔助方法：將相對座標 (x, y) 轉為陣列索引
  setTile(tiles, x, y, size, type) {
      const arrayX = x + size;
      const arrayY = y + size;
      const width = size * 2;
      tiles[arrayY * width + arrayX] = type;
  }

  createWall(x, y) {
      const id = this.game.generateId();
      const wall = new Wall(id, x, y);
      this.game.createEntity(wall);
  }

  createAsteroid(x, y, type) {
      const id = this.game.generateId();
      const asteroid = new Asteroid(id, x, y, type);
      this.game.createEntity(asteroid);
  }
}

module.exports = WorldGenerator;