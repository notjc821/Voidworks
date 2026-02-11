import * as PIXI from 'pixi.js';
import * as CommonPkg from '@voidworks/common';
import TextureManager from './TextureManager';

const { Constants } = CommonPkg.default || CommonPkg;

class InventoryManager {
  constructor(app, gameClient) {
    this.app = app;
    this.gameClient = gameClient;
    this.isOpen = false;

    this.container = new PIXI.Container();
    this.container.visible = false;
    this.app.stage.addChild(this.container);

    // [修正] 加寬面板以容納 9 格
    this.panelWidth = 900; 
    this.panelHeight = 500;
    
    // 初始化 UI
    this.initBackground();
    this.initSlots();
    this.initCrafting();
    
    // 初始執行一次 resize 確保置中
    this.resize(window.innerWidth, window.innerHeight);
  }

  initBackground() {
    // 1. 半透明背景 (存為 this.bg 以便 resize 使用)
    this.bg = new PIXI.Graphics();
    this.bg.eventMode = 'static'; // 阻擋點擊
    this.container.addChild(this.bg);

    // 2. 主面板 (存為 this.panel)
    this.panel = new PIXI.Graphics();
    this.panel.lineStyle(2, 0x444444);
    this.panel.beginFill(0x222222);
    this.panel.drawRoundedRect(0, 0, this.panelWidth, this.panelHeight, 10);
    this.container.addChild(this.panel);
    
    // 3. 標題
    const style = new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 24, fill: '#ffffff' });
    this.title = new PIXI.Text("INVENTORY", style);
    this.container.addChild(this.title);
  }

  // [新增] 響應式調整 (全螢幕/視窗縮放時呼叫)
  resize(w, h) {
    if (!this.bg || !this.panel) return;

    // 重畫全螢幕遮罩
    this.bg.clear();
    this.bg.beginFill(0x000000, 0.8);
    this.bg.drawRect(0, 0, w, h);
    this.bg.endFill();

    // 重新計算面板位置 (置中)
    this.panelX = (w - this.panelWidth) / 2;
    this.panelY = (h - this.panelHeight) / 2;

    this.panel.x = this.panelX;
    this.panel.y = this.panelY;

    // 更新標題位置
    if (this.title) {
        this.title.x = this.panelX + 20;
        this.title.y = this.panelY + 20;
    }

    // 更新格子容器位置
    if (this.slotsContainer) {
        this.slotsContainer.x = this.panelX + 300; 
        this.slotsContainer.y = this.panelY + 100;
    }

    // 更新合成按鈕位置 (比較麻煩，這裡簡單重畫或移動容器)
    // 為了簡單，我們移動整個 craftingContainer (如果你有把按鈕分群的話)
    // 這裡我們直接更新按鈕座標
    if (this.craftingButtons) {
        let startY = this.panelY + 380;
        this.craftingButtons.forEach((btnGroup, index) => {
            btnGroup.y = startY + (index * 40);
            btnGroup.x = this.panelX + 50;
        });
    }
  }

  initSlots() {
    this.slotsContainer = new PIXI.Container();
    this.container.addChild(this.slotsContainer);
    this.slotGraphics = [];

    // Constants.UI 預設值保護
    const uiConfig = Constants.UI || { INVENTORY_WIDTH: 9, INVENTORY_HEIGHT: 4, SLOT_SIZE: 50, PADDING: 10 };

    for (let y = 0; y < uiConfig.INVENTORY_HEIGHT; y++) {
      for (let x = 0; x < uiConfig.INVENTORY_WIDTH; x++) {
        const size = uiConfig.SLOT_SIZE;
        const pad = uiConfig.PADDING;
        
        const slot = new PIXI.Graphics();
        slot.lineStyle(2, 0x555555);
        slot.beginFill(0x333333);
        slot.drawRect(x * (size + pad), y * (size + pad), size, size);
        this.slotsContainer.addChild(slot);
        
        this.slotGraphics.push({ bg: slot, itemSprite: null, text: null, x: x * (size + pad), y: y * (size + pad) });
      }
    }
  }

  initCrafting() {
    this.craftingButtons = []; // 儲存按鈕引用以便 resize
    let startY = this.panelY + 380;
    
    const recipes = Constants.RECIPES || []; 

    recipes.forEach((recipe, index) => {
        // 使用一個容器來包裝按鈕和文字，方便一起移動
        const btnGroup = new PIXI.Container();
        
        const btn = new PIXI.Graphics();
        btn.beginFill(0x4444AA);
        btn.drawRoundedRect(0, 0, 200, 30, 5); // 座標設為 0,0，由 btnGroup 決定位置
        btn.endFill();
        
        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        
        btn.on('pointerdown', () => {
            this.gameClient.sendCraftRequest(recipe.id);
        });

        const text = new PIXI.Text(`Craft ${recipe.result}`, { fontSize: 14, fill: '#ffffff' });
        text.x = 10;
        text.y = 5;

        btnGroup.addChild(btn);
        btnGroup.addChild(text);
        
        this.container.addChild(btnGroup);
        this.craftingButtons.push(btnGroup);
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.container.visible = this.isOpen;
    
    // 每次打開時重新校準一次大小，以防萬一
    if (this.isOpen) {
        this.resize(window.innerWidth, window.innerHeight);
    } else {
    }
  }

  updateInventory(itemsMap) {
    // (這部分邏輯保持不變)
    this.slotGraphics.forEach(s => {
        if (s.itemSprite) s.itemSprite.destroy();
        if (s.text) s.text.destroy();
        s.itemSprite = null; s.text = null;
    });

    let idx = 0;
    // 防呆處理
    if (!itemsMap) return;
    
    // itemsMap 可能是 Object 或 Map，統一處理
    const entries = itemsMap instanceof Map ? itemsMap.entries() : Object.entries(itemsMap);

    for (const [itemId, count] of entries) {
        if (idx >= this.slotGraphics.length) break;
        if (count <= 0) continue;

        const slot = this.slotGraphics[idx];
        let tex = 'rock'; 
        if (itemId == '1') tex = 'rock';
        if (itemId == '2') tex = 'wall';

        const sprite = new PIXI.Sprite(TextureManager.get(tex));
        sprite.width = 32; sprite.height = 32;
        sprite.x = slot.x + this.slotsContainer.x + 9;
        sprite.y = slot.y + this.slotsContainer.y + 9;
        this.container.addChild(sprite);
        slot.itemSprite = sprite;

        const text = new PIXI.Text(count, { fontSize: 12, fill: '#fff' });
        text.x = sprite.x + 20; text.y = sprite.y + 20;
        this.container.addChild(text);
        slot.text = text;
        
        idx++;
    }
  }
}

export default InventoryManager;