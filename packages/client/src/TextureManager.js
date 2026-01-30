import * as PIXI from 'pixi.js';

class TextureManager {
  constructor() {
    this.textures = new Map();
    this.defaultTexture = PIXI.Texture.WHITE; // Fallback
  }

  load() {
    return new Promise((resolve, reject) => {
      // 定義要加載的資源列表
      // key: 程式中引用的名稱, value: 檔案路徑
      const assets = {
        'player': '/assets/images/player.png',
        'wall': '/assets/images/wall.png',
        'asteroid': '/assets/images/asteroid.png',
        'rock': '/assets/images/rock.png',
        // 如果你有背景圖，也可以加在這裡
        // 'space_bg': '/assets/images/background.png' 
      };

      // PIXI v7+ 使用 Assets.load (如果你是用 v7)
      // 但為了相容性與簡單起見，我們用簡單的方式逐一加載
      
      const loader = PIXI.Assets; // v7 API

      const promises = Object.entries(assets).map(([key, path]) => {
        return loader.load(path).then(texture => {
            this.textures.set(key, texture);
            console.log(`[TextureManager] Loaded: ${key}`);
        }).catch(err => {
            console.warn(`[TextureManager] Failed to load ${path}, using fallback.`);
        });
      });

      Promise.all(promises).then(() => {
        console.log('[TextureManager] All assets loaded.');
        resolve();
      });
    });
  }

  get(key) {
    return this.textures.get(key) || this.defaultTexture;
  }
}

export default new TextureManager();