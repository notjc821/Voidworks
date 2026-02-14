const Entity = require('./Entity');
const { Constants } = require('@voidworks/common');

class Player extends Entity {
  constructor(id, x, y) {
    super(id, x, y);
    this.type = Constants.Entities.PLAYER;
    
    this.name = "Unknown";
    this.inventory = new Map();
    
    this.health = 100;
    this.maxHealth = 100;
    this.oxygen = 100;
    this.maxOxygen = 100;
    this.isDead = false;
    
    this.speed = 150;
    this.lastActionTime = 0;

    this.inputState = {
        up: false, down: false, left: false, right: false,
        mouseAngle: 0, isShooting: false, selectedSlot: 0
    };
  }

  applyInput(input) {
    if (!input) return;

    if (this.isDead) {
        this.body.velocity[0] = 0;
        this.body.velocity[1] = 0;
        return;
    }

    let vx = 0;
    let vy = 0;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;

    if (vx !== 0 && vy !== 0) {
        const length = Math.sqrt(vx * vx + vy * vy);
        vx /= length;
        vy /= length;
    }

    this.body.velocity[0] = vx * this.speed;
    this.body.velocity[1] = vy * this.speed;

    this.body.angle = input.mouseAngle;
  }

  update(dt) {
      if (this.health < this.maxHealth) {
          this.health = Math.min(this.maxHealth, this.health + dt * 1);
      }
  }

  damage(amount) {
      this.health -= amount;
      if (this.health <= 0) this.die();
  }

  die() {
    this.isDead = true;
    console.log(`[Game] Player ${this.name} died.`);
    this.body.velocity[0] = 0;
    this.body.velocity[1] = 0;
    setTimeout(() => this.respawn(), 3000);
  }

  respawn() {
    this.isDead = false;
    this.health = this.maxHealth;
    this.oxygen = this.maxOxygen;
    this.body.position[0] = 0;
    this.body.position[1] = 0;
    this.body.velocity[0] = 0;
    this.body.velocity[1] = 0;
  }

  serialize() {
    return {
      id: String(this.id), 
      type: this.type,
      x: this.body.position[0],
      y: this.body.position[1],
      angle: this.body.angle,
      health: this.health,
      maxHealth: this.maxHealth,
      name: this.name,
      oxygen: this.oxygen,
      maxOxygen: this.maxOxygen
    };
  }
}

module.exports = Player;