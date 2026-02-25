import * as PIXI from 'pixi.js';

class TextureManager {
  constructor() {
    this.textures = new Map();
    this.defaultTexture = PIXI.Texture.WHITE; // 預設白圖，避免崩潰
    
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
  }

  async load() {
    // 定義資源清單 (Key -> 檔名)
    const assets = {
      // --- 角色部件 (保留用於組合渲染) ---
      'player_body': 'player_body.png',
      'player_hands': 'player_hands.png',
      
      // --- 工具與建築 ---
      'wall': 'wall.png',
      'Pickaxe': 'Pickaxe.png',
      
      // --- 資源實體 (礦石) ---
      'Copper Ore': 'Copper Ore.png',
      'Iron Ore': 'Iron Ore.png',
      'Aluminum Ore': 'Aluminum Ore.png',
      'Gold Ore': 'Gold Ore.png',
      'Titanium Ore': 'Titanium Ore.png',
      'Platinum Ore': 'Platinum Ore.png',
      'Silver Ore': 'Silver Ore.png',

      // --- 地形實體 ---
      'Stone': 'Stone.png',
      'Asteroid Rock': 'Asteroid Rock.png',
      'Basalt': 'Basalt.png',
      'Ice Layer': 'Ice Layer.png',
      'Icy Comet Ice': 'Icy Comet Ice.png',
      'Iron-Nickel Asteroid Rock': 'Iron-Nickel Asteroid Rock.png',
      'Porous Asteroid Rock': 'Porous Asteroid Rock.png',
      'Sand': 'Sand.png',
      'Sandstone': 'Sandstone.png',
      'Soil': 'Soil.png',
      'Frozen Soil': 'Frozen Soil.png',
      'Volcanic Rock': 'Volcanic Rock.png',
      
      // --- 背景與環境特效 ---
      'Space Bedrock': 'Space Bedrock.png',
      'Space Void': 'Space Void.png',
      'Stellar Plasma': 'Stellar Plasma.png',
      'Nebula Dust Cloud': 'Nebula Dust Cloud.png',
      'Glowing Nebula Gas': 'Glowing Nebula Gas.png',
      'Dark Nebula Particle': 'Dark Nebula Particle.png'
    };

    const promises = [];

    for (const [key, filename] of Object.entries(assets)) {
      const loadPromise = PIXI.Assets.load(`assets/images/${filename}`).then(texture => {
        if (texture.baseTexture) {
             texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
        }
        this.textures.set(key, texture);
      }).catch(err => {
        console.error(`[TextureManager] Failed to load ${filename}:`, err);
      });
      promises.push(loadPromise);
    }

    await Promise.all(promises);
    console.log('[TextureManager] All assets loaded.');
  }

  get(key) {
    return this.textures.get(key) || this.defaultTexture;
  }
}

export default new TextureManager();