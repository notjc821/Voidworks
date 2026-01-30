const Entity = require('./Entity');
const Constants = require('../../../common/Constants');

class Player extends Entity {
  constructor(id, game, name) {
    // 隨機出生點 (-200 到 200)
    const startX = (Math.random() - 0.5) * 400;
    const startY = (Math.random() - 0.5) * 400;
    
    super(id, game.world, startX, startY, 16); // 半徑 16
    this.game = game;

    this.type = Constants.Entities.PLAYER;
    this.name = name || "Unknown";
    
    // --- 生存數值 ---
    this.maxHealth = 100;
    this.health = this.maxHealth;

    this.maxOxygen = 100;
    this.oxygen = this.maxOxygen;
    
    this.isDead = false;
    this.speed = 150; // 移動速度
  }

  // [補回] 處理輸入控制 (WASD + 滑鼠)
  applyInput(input) {
    if (this.isDead) {
        this.body.velocity = [0, 0];
        return;
    }

    // 重置速度
    this.body.velocity[0] = 0;
    this.body.velocity[1] = 0;

    // 根據輸入設定速度
    if (input.up) this.body.velocity[1] = -this.speed;
    if (input.down) this.body.velocity[1] = this.speed;
    if (input.left) this.body.velocity[0] = -this.speed;
    if (input.right) this.body.velocity[0] = this.speed;

    // 設定角度
    this.body.angle = input.mouseAngle;
  }

  update(dt) {
    if (this.isDead) return;

    // 1. 氧氣自然消耗 (每秒 2 點)
    this.oxygen -= 2 * dt;
    
    // 2. 缺氧扣血
    if (this.oxygen <= 0) {
        this.oxygen = 0;
        this.damage(10 * dt); // 缺氧每秒扣 10 血
    } else {
        // 有氧氣時緩慢回血
        if (this.health < this.maxHealth) {
            this.health += 2 * dt;
        }
    }

    // 確保數值不溢出
    if (this.oxygen > this.maxOxygen) this.oxygen = this.maxOxygen;
    if (this.health > this.maxHealth) this.health = this.maxHealth;
  }

  damage(amount) {
    if (this.isDead) return;
    
    this.health -= amount;
    if (this.health <= 0) {
        this.health = 0;
        this.die();
    }
  }

  die() {
    this.isDead = true;
    console.log(`[Game] Player ${this.name} died.`);
    
    // 停止移動
    this.body.velocity = [0, 0];

    // 3秒後重生
    setTimeout(() => this.respawn(), 3000);
  }

  respawn() {
    if (!this.game) return;

    this.isDead = false;
    this.health = this.maxHealth;
    this.oxygen = this.maxOxygen;
    
    // 重置物理位置
    this.body.position = [0, 0];
    this.body.velocity = [0, 0];
    this.body.angularVelocity = 0;
    
    console.log(`[Game] Player ${this.name} respawned.`);
  }

  serialize() {
    return {
      id: this.id,
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