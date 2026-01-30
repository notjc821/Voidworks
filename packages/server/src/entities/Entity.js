const p2 = require('p2');

class Entity {
  constructor(id, world, x, y, radius) {
    this.id = id;
    this.world = world;
    
    this.body = new p2.Body({
      mass: 1,
      position: [x, y],
      damping: 0.5, // damping to reduce velocity over time
      angle: 0
    });

    this.shape = new p2.Circle({ radius: radius });
    this.body.addShape(this.shape);
  }

  serialize() {
    return {
      id: this.id,
      x: this.body.position[0],
      y: this.body.position[1],
      angle: this.body.angle
    };
  }
}

module.exports = Entity;