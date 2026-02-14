import * as CommonPkg from '@voidworks/common';
const { Constants } = CommonPkg.default || CommonPkg;

class UIManager {
  constructor() {
    this.hpBar = document.getElementById('hp-bar');
    this.oxygenBar = document.getElementById('oxygen-bar');
    this.debugInfo = document.getElementById('debug-info');
    this.hotbarContainer = document.getElementById('hotbar-container');

    this.selectedSlotIndex = 0;
    
    if (this.hotbarContainer) {
        this.initHotbar();
    }
  }

  initHotbar() {
    this.hotbarContainer.innerHTML = '';
    const slotCount = Constants.UI.INVENTORY_WIDTH || 9; 

    for (let i = 0; i < slotCount; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.index = i;
      if (i === 0) slot.classList.add('active');
      
      const key = document.createElement('span');
      key.className = 'key';
      key.innerText = i + 1;
      slot.appendChild(key);
      
      this.hotbarContainer.appendChild(slot);
    }
  }

  selectSlot(index) {
      if (!this.hotbarContainer) return;
      this.selectedSlotIndex = index;
      const slots = this.hotbarContainer.getElementsByClassName('slot');
      
      for (let i = 0; i < slots.length; i++) {
          if (i === index) slots[i].classList.add('active');
          else slots[i].classList.remove('active');
      }
  }

  updateInventory(itemsMap) {
    if (!this.hotbarContainer) return;

    const slots = this.hotbarContainer.getElementsByClassName('slot');
    const slotCount = Constants.UI?.INVENTORY_WIDTH || 9;

    // 先清空所有快捷欄的圖示與數量
    for (let i = 0; i < slotCount; i++) {
        if (!slots[i]) continue;
        const slot = slots[i];
        
        const existingImg = slot.querySelector('img');
        const existingCount = slot.querySelector('.count');
        if (existingImg) existingImg.remove();
        if (existingCount) existingCount.remove();
        delete slot.dataset.itemId; 
    }

    if (!itemsMap) return;

    // 處理資料格式相容 (Map 或 Object)
    const entries = itemsMap instanceof Map 
        ? Array.from(itemsMap.entries()) 
        : Object.entries(itemsMap);

    // 過濾出數量 > 0 的物品
    const validItems = entries.filter(([id, count]) => count > 0);

    // 依序填入格子 (最多填滿 slotCount 格)
    for (let i = 0; i < Math.min(validItems.length, slotCount); i++) {
        const [itemIdStr, count] = validItems[i];
        const itemId = parseInt(itemIdStr);
        const slot = slots[i];

        if (!slot) continue;

        // 根據 ItemID 決定圖示路徑
        let imgSrc = 'assets/images/Stone.png';
        
        // 工具
        if (itemId === Constants.Items.PICKAXE) imgSrc = 'assets/images/Pickaxe.png';
        else if (itemId === Constants.Items.WELDER) imgSrc = 'assets/images/Stone.png'; // 暫時沒有 Welder 圖，先用 stone.png
        else if (itemId === Constants.Items.GRAPPLE) imgSrc = 'assets/images/Stone.png'; // 暫時沒有 Grapple 圖，先用 stone.png
        
        // 資源
        else if (itemId === Constants.Items.STONE) imgSrc = 'assets/images/Stone.png';
        else if (itemId === Constants.Items.COPPER_ORE) imgSrc = 'assets/images/Copper Ore.png';
        else if (itemId === Constants.Items.IRON_ORE) imgSrc = 'assets/images/Iron Ore.png';
        else if (itemId === Constants.Items.WALL_ITEM) imgSrc = 'assets/images/wall.png';
        
        // 預設
        else imgSrc = 'assets/images/Stone.png';

        // 產生圖片
        const img = document.createElement('img');
        img.src = imgSrc;
        slot.appendChild(img);

        // 記錄該格裝了什麼 (給之後切換武器/建造用)
        slot.dataset.itemId = itemId;

        // 產生數量
        if (count > 1) {
            const countSpan = document.createElement('span');
            countSpan.className = 'count';
            countSpan.innerText = count;
            slot.appendChild(countSpan);
        }
    }

    // 保持選中狀態
    this.selectSlot(this.selectedSlotIndex);
  }

  updateStats(hp, maxHp, oxygen, maxOxygen) {
    if (this.hpBar) {
        const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
        this.hpBar.style.width = `${pct}%`;
    }
    if (this.oxygenBar) {
        const pct = Math.max(0, Math.min(100, (oxygen / maxOxygen) * 100));
        this.oxygenBar.style.width = `${pct}%`;
    }
  }

  updateDebugInfo(x, y, id) {
    this.debugInfo.innerText = `Pos: (${Math.round(x)}, ${Math.round(y)}) | ID: ${id}`;
  }
}

export default new UIManager();