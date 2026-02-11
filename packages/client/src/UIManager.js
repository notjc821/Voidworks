import * as CommonPkg from '@voidworks/common';
const { Constants } = CommonPkg.default || CommonPkg;

class UIManager {
  constructor() {
    this.hpBar = document.getElementById('hp-bar');
    this.oxygenBar = document.getElementById('oxygen-bar');
    this.debugInfo = document.getElementById('debug-info');
    this.hotbarContainer = document.getElementById('hotbar-container');
    
    this.initHotbar();
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
        
        // 移除自訂屬性，準備重新填入
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
        let imgSrc = 'assets/images/rock.png'; // 預設圖
        
        if (itemId === Constants.Items.STONE) {
            imgSrc = 'assets/images/rock.png';
        } else if (itemId === Constants.Items.COPPER_ORE) {
            imgSrc = 'assets/images/asteroid.png'; // 如果你有 copper.png 就換掉
        } else if (itemId === Constants.Items.IRON_ORE) {
             imgSrc = 'assets/images/asteroid.png'; // 同上
        } else if (itemId === Constants.Items.WALL_ITEM) { 
            // 注意：如果在你的架構中，牆壁算作物品，它也會有 ID (2)
            imgSrc = 'assets/images/wall.png';
        }

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