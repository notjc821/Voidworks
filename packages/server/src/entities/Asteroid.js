const Entity = require('./Entity');
const Constants = require('../../../common/Constants');
const p2 = require('p2');

class Asteroid extends Entity {
  constructor(id, x, y, type) {
    super(id, null, x, y, 20); // 稍微大一點
    
    // type 可以是 COPPER 或 IRON
    this.type = type || Constants.Entities.ASTEROID_COPPER;

    // 礦石也是靜態的
    this.body.mass = 0;
    this.body.type = p2.Body.STATIC;
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      x: this.body.position[0],
      y: this.body.position[1],
      angle: this.body.angle,
      health: 100,
      maxHealth: 100
    };
  }
}

module.exports = Asteroid;