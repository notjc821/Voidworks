const Entity = require('./Entity');
const { Constants } = require('@voidworks/common');

class Asteroid extends Entity {
  constructor(id, x, y, oreType) {
    super(id, x, y);
    // 如果有指定 oreType 就用指定的，否則預設石頭
    this.type = oreType || Constants.Entities.STONE;
    
    // 從 Registry 讀取血量，如果沒有就預設 50
    const stats = Constants.BlockRegistry[this.type];
    this.maxHealth = stats ? stats.maxHealth : 50;
    this.health = this.maxHealth;

    this.body.type = 0; // STATIC
    this.body.mass = 0;
  }

  serialize() {
    return {
      id: String(this.id), // [關鍵修正]
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

module.exports = Asteroid;