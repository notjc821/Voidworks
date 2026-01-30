import * as CommonPkg from '@voidworks/common';
const { Constants } = CommonPkg.default || CommonPkg;

class UIManager {
  constructor() {
    this.hotbarSlots = [];
    this.initHotbar();
  }

  initHotbar() {
    const container = document.getElementById('hotbar-container');
    if (!container) return;
    
    container.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.id = `slot-${i}`;
        slot.innerHTML = `<span style="position:absolute; top:2px; left:4px; font-size:10px; color:#aaa">${i+1}</span>`;
        container.appendChild(slot);
        this.hotbarSlots.push(slot);
    }
  }

  updateStats(fps, myPlayerEntity) {
    const fpsEl = document.getElementById('debug-info');
    if (fpsEl) fpsEl.innerText = `${Math.round(fps)} FPS`;

    // 更新血條與氧氣條
    if (myPlayerEntity) {
        const hpPercent = (myPlayerEntity.health / myPlayerEntity.maxHealth) * 100;
        const o2Percent = (myPlayerEntity.oxygen / myPlayerEntity.maxOxygen) * 100;

        const hpBar = document.getElementById('health-bar');
        const o2Bar = document.getElementById('oxygen-bar');

        if (hpBar) hpBar.style.width = `${Math.max(0, hpPercent)}%`;
        if (o2Bar) o2Bar.style.width = `${Math.max(0, o2Percent)}%`;
    }
  }

  updateInventory(items) {
    this.hotbarSlots.forEach(slot => {
        const num = slot.querySelector('span').innerText;
        slot.innerHTML = `<span style="position:absolute; top:2px; left:4px; font-size:10px; color:#aaa">${num}</span>`;
    });

    let index = 0;
    for (const [id, count] of Object.entries(items)) {
        if (index >= this.hotbarSlots.length) break;

        let iconName = 'rock'; 
        if (id == Constants.Items.COPPER_ORE) iconName = 'asteroid';
        if (id == Constants.Items.IRON_ORE) iconName = 'wall';
        
        const imgPath = `/assets/images/${iconName}.png`;

        const slot = this.hotbarSlots[index];
        slot.innerHTML += `
            <img src="${imgPath}" onerror="this.style.display='none'">
            <div class="count">${count}</div>
        `;
        index++;
    }
  }
}

export default new UIManager();