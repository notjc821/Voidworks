import * as PIXI from 'pixi.js';
import * as CommonPkg from '@voidworks/common';
import TextureManager from './TextureManager';

// 兼容不同的模組載入方式
const { Constants, Protocol } = CommonPkg.default || CommonPkg;

class InventoryManager {
  constructor() {
    this.isOpen = false;
    this.container = new PIXI.Container();
    this.container.visible = false;
    this.gameClient = null;
    
    this.slots = [];
    this.slotGraphics = []; // 儲存格子的 PIXI 物件
  }

  // [新增] 核心初始化方法 (修復 init is not a function)
  async init(gameClient) {
    this.gameClient = gameClient;
    
    // 將背包容器加入到 PIXI 應用的最上層 (UI 層)
    // 確保它在 WorldContainer (地圖) 之上
    this.gameClient.renderer.app.stage.addChild(this.container);

    this.initUI();
    this.resize(window.innerWidth, window.innerHeight);
  }

  initUI() {
    // 1. 半透明黑色背景
    this.bg = new PIXI.Graphics();
    this.bg.beginFill(0x000000, 0.8);
    this.bg.drawRect(0, 0, 800, 600); // 暫時大小，resize 會修正
    this.bg.endFill();
    // 阻擋點擊穿透
    this.bg.eventMode = 'static';
    this.container.addChild(this.bg);

    // 2. 背包面板區域
    this.slotsContainer = new PIXI.Container();
    this.container.addChild(this.slotsContainer);

    this.initSlots();
  }

  initSlots() {
    const cols = Constants.UI.INVENTORY_WIDTH;
    const rows = Constants.UI.INVENTORY_HEIGHT;
    const size = Constants.UI.SLOT_SIZE;
    const pad = Constants.UI.PADDING;

    // 計算面板總寬高
    const totalW = cols * (size + pad) + pad;
    const totalH = rows * (size + pad) + pad;

    // 繪製格子
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const slot = new PIXI.Graphics();
            slot.beginFill(0x333333);
            slot.lineStyle(2, 0x666666);
            slot.drawRect(0, 0, size, size);
            slot.endFill();
            
            slot.x = pad + x * (size + pad);
            slot.y = pad + y * (size + pad);
            
            // 互動事件 (點擊合成或裝備)
            slot.eventMode = 'static';
            slot.cursor = 'pointer';
            
            this.slotsContainer.addChild(slot);
            this.slotGraphics.push(slot);
        }
    }

    // 將格子容器置中
    this.slotsContainer.x = -totalW / 2;
    this.slotsContainer.y = -totalH / 2;
  }

  // [新增] 視窗縮放處理 (修復 resize is not a function)
  resize(w, h) {
      if (!this.bg) return;

      // 背景全螢幕覆蓋
      this.bg.clear();
      this.bg.beginFill(0x000000, 0.8);
      this.bg.drawRect(-w/2, -h/2, w, h); // 相對中心點
      this.bg.endFill();

      // 容器永遠保持在螢幕中心
      this.container.x = w / 2;
      this.container.y = h / 2;
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.container.visible = this.isOpen;
    
    // 當打開背包時，強制呼叫一次 resize 確保位置正確
    if (this.isOpen) {
        this.resize(window.innerWidth, window.innerHeight);
    }
  }

  updateInventory(itemsMap) {
    // 清空舊圖示
    this.slotGraphics.forEach(s => {
        if (s.itemSprite) {
            s.itemSprite.destroy();
            s.itemSprite = null;
        }
        if (s.text) {
            s.text.destroy();
            s.text = null;
        }
    });

    let idx = 0;
    if (!itemsMap) return;
    
    const entries = itemsMap instanceof Map ? itemsMap.entries() : Object.entries(itemsMap);

    for (const [itemIdStr, count] of entries) {
        if (idx >= this.slotGraphics.length) break;
        if (count <= 0) continue;

        const itemId = parseInt(itemIdStr);
        const slot = this.slotGraphics[idx];
        
        // 圖片映射 (確保沒有 rock.png)
        let tex = 'Stone'; 
        
        if (itemId === Constants.Items.STONE) tex = 'Stone';
        else if (itemId === Constants.Items.PICKAXE) tex = 'Pickaxe';
        else if (itemId === Constants.Items.WALL_ITEM) tex = 'wall';
        else if (itemId === Constants.Items.COPPER_ORE) tex = 'Copper Ore';
        else if (itemId === Constants.Items.IRON_ORE) tex = 'Iron Ore';
        else if (itemId === Constants.Items.GOLD_ORE) tex = 'Gold Ore';
        else if (itemId === Constants.Items.ALUMINUM_ORE) tex = 'Aluminum Ore';
        // ... 其他映射
        
        const sprite = new PIXI.Sprite(TextureManager.get(tex));
        
        // 調整圖示大小與位置
        sprite.width = 32; sprite.height = 32;
        sprite.anchor.set(0.5);
        sprite.x = 25; // Slot size 50 的一半
        sprite.y = 25;
        
        slot.addChild(sprite);
        slot.itemSprite = sprite;

        // 數量文字
        const text = new PIXI.Text(count, { 
            fontSize: 12, 
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        text.anchor.set(1, 1);
        text.x = 48;
        text.y = 48;
        slot.addChild(text);
        slot.text = text;
        
        idx++;
    }
  }
}

export default new InventoryManager();