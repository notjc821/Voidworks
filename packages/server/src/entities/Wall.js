const Entity = require('./Entity');
const { Constants } = require('@voidworks/common');

class Wall extends Entity {
  constructor(id, x, y) {
    super(id, x, y);
    this.type = Constants.Entities.WALL;
    this.health = 100;
    this.maxHealth = 100;
    
    // 牆壁是靜態的
    this.body.type = 0; // p2.Body.STATIC (0) -> 改成直接寫 0 避免依賴引用問題
    this.body.mass = 0;
  }

  // 如果 Wall 沒有特殊的數據要傳，可以繼承 Entity.serialize
  // 但為了保險，我們這裡明確覆寫並轉型 ID
  serialize() {
    return {
      id: String(this.id), 
      type: this.type,
      x: this.body.position[0],
      y: this.body.position[1],
      angle: this.body.angle,
      health: this.health,
      maxHealth: this.maxHealth,
      name: "",
      oxygen: 0,
      maxOxygen: 0
    };
  }
}

module.exports = Wall;