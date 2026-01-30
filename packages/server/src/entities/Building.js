const Entity = require('./Entity');
const p2 = require('p2');

class Building extends Entity {
  constructor(game, type, x, y) {
    super(game, type, x, y);
    
    this.health = 200;
    this.maxHealth = 200;
    
    // Buildings are static
    this.body.type = p2.Body.STATIC;
    this.body.mass = 0;
    this.body.updateMassProperties();

    // Replace circle with box for walls
    this.body.removeShape(this.shape);
    this.shape = new p2.Box({ width: 32, height: 32 });
    this.body.addShape(this.shape);
  }
}

module.exports = Building;