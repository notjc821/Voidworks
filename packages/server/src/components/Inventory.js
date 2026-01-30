const { Protocol } = require('@voidworks/common');

class Inventory {
  constructor(player) {
    this.player = player;
    this.items = new Map(); // Map<ItemId, Count>
    this.isDirty = false;   // Track if sync is needed
  }

  /**
   * Add item to inventory
   * @param {number} itemId 
   * @param {number} count 
   */
  addItem(itemId, count = 1) {
    const current = this.items.get(itemId) || 0;
    this.items.set(itemId, current + count);
    this.isDirty = true;
    
    console.log(`[Inventory] Player ${this.player.id} gained item ${itemId} (Total: ${this.items.get(itemId)})`);
    this.sync();
  }

  /**
   * Remove item from inventory
   * @param {number} itemId 
   * @param {number} count 
   * @returns {boolean} True if successful, False if not enough items
   */
  removeItem(itemId, count = 1) {
    const current = this.items.get(itemId) || 0;
    if (current < count) return false;

    const newValue = current - count;
    if (newValue === 0) {
        this.items.delete(itemId);
    } else {
        this.items.set(itemId, newValue);
    }
    
    this.isDirty = true;
    return true;
  }

  /**
   * Check if player has enough items
   */
  hasItem(itemId, count = 1) {
    return (this.items.get(itemId) || 0) >= count;
  }

  /**
   * Send inventory update to client
   */
  sync() {
    if (!this.isDirty) return;

    // Convert Map to Object for Protobuf map<key, value>
    const itemsObj = {};
    this.items.forEach((val, key) => {
        itemsObj[key] = val;
    });

    try {
      const packet = Protocol.encodeServerPacket({
        inventory: {
          items: itemsObj
        }
      });
      this.player.socket.send(packet, true);
      this.isDirty = false;
    } catch (err) {
      console.error("[Inventory] Sync failed:", err);
    }
  }
}

module.exports = Inventory;