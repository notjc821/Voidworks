const p2 = require('p2');
const { Constants } = require('@voidworks/common');

class Entity {
  constructor(id, x, y) {
    this.id = id;
    this.type = 0;
    this.health = 100;
    this.maxHealth = 100;
    
    // 預設物理剛體
    this.body = new p2.Body({
        mass: 1,
        position: [x, y],
        fixedRotation: true
    });
    
    // 預設形狀
    this.shape = new p2.Box({ width: Constants.World.TILE_SIZE, height: Constants.World.TILE_SIZE });
    this.body.addShape(this.shape);
  }

  update(dt) {
      // 預設無行為
  }

  // [關鍵修正] 強制將 ID 轉為字串 String(this.id)
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

module.exports = Entity;