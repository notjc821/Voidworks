import * as PIXI from 'pixi.js';

class TextureManager {
  constructor() {
    this.textures = new Map();
    
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
    PIXI.BaseTexture.defaultOptions.mipmap = PIXI.MIPMAP_MODES.OFF;
    PIXI.BaseTexture.defaultOptions.wrapMode = PIXI.WRAP_MODES.CLAMP;
  }

  async load() {
    const assets = [
      { name: 'player', url: 'assets/images/player.png' },
      { name: 'rock', url: 'assets/images/rock.png' },
      { name: 'asteroid', url: 'assets/images/asteroid.png' },
      { name: 'wall', url: 'assets/images/wall.png' }
    ];

    const loader = PIXI.Assets;

    for (const asset of assets) {
      try {
        const texture = await loader.load(asset.url);
        this.textures.set(asset.name, texture);
        console.log(`[TextureManager] Loaded: ${asset.name}`);
      } catch (e) {
        console.error(`[TextureManager] Failed to load ${asset.name}:`, e);
      }
    }
    
    console.log("[TextureManager] All assets loaded.");
  }

  get(name) {
    return this.textures.get(name) || PIXI.Texture.WHITE;
  }
}

export default new TextureManager();