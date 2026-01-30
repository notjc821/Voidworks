const Entity = require('./Entity');
const Constants = require('../../../common/Constants');
const p2 = require('p2');

class Wall extends Entity {
  constructor(id, x, y) {
    super(id, null, x, y, 16); // 半徑 16 (32x32 格子的一半)
    this.type = Constants.Entities.WALL;

    // 牆壁是靜態的，質量為 0，不會被推動
    this.body.mass = 0;
    this.body.type = p2.Body.STATIC;
    
    // 將圓形碰撞體改為方形，這樣比較像牆壁
    this.body.removeShape(this.shape);
    this.shape = new p2.Box({ width: 32, height: 32 });
    this.body.addShape(this.shape);
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

module.exports = Wall;