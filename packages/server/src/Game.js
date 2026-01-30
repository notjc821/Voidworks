const p2 = require('p2');
const Constants = require('../../common/Constants');
const Player = require('./entities/Player');
const Wall = require('./entities/Wall');
const Asteroid = require('./entities/Asteroid');
const WorldGenerator = require('./map/WorldGenerator');

class Game {
  constructor(server) {
    this.server = server;
    
    this.world = new p2.World({
      gravity: [0, 0]
    });

    this.players = new Map();
    this.entities = new Map();
    this.inputs = new Map();

    this.lastTime = Date.now();
    this.accumulator = 0;
    this.stepSize = 1 / 60;

    // 初始化地圖
    this.initMap();
    
    // 注意：這裡不呼叫 this.loop()，由 Server.js 呼叫 start()
  }

  start() {
    console.log("[Game] Engine starting...");
    this.lastTime = Date.now();
    this.loop();
  }

  initMap() {
    console.log("[Game] Initializing Map via WorldGenerator...");
    const generator = new WorldGenerator(this);
    
    // 生成地圖並存入 this.mapData
    this.mapData = generator.generate(25); // 25x2 = 50 格寬度
    
    console.log(`[Game] Map Generated. Size: ${this.mapData.width}x${this.mapData.height}`);
  }

  // ... (generateId, createEntity, removeEntity 保持不變) ...
  generateId() {
      return Math.random().toString(36).substr(2, 9);
  }

  createEntity(entity) {
      this.entities.set(entity.id, entity);
      this.world.addBody(entity.body);
      return entity;
  }
  
  removeEntity(entityId) {
      const entity = this.entities.get(entityId);
      if (entity) {
          this.world.removeBody(entity.body);
          this.entities.delete(entityId);
          if (this.players.has(entityId)) {
              this.players.delete(entityId);
          }
      }
  }

  // ... (join, leave, handleInput, handleBuild 等方法保持不變) ...
  // 請確保 handleBuild 和 checkShooting 都在 (如上一階段所述)

  join(playerId, name) {
    const player = new Player(playerId, this, name);
    player.inventory = { [Constants.Items.STONE]: 50, [Constants.Items.COPPER_ORE]: 0 }; // 初始資源
    this.createEntity(player);
    this.players.set(playerId, player);
    return player;
  }

  leave(playerId) { this.removeEntity(playerId); }

  handleInput(playerId, inputData) { this.inputs.set(playerId, inputData); }

  handleBuild(playerId, buildData) {
      const player = this.players.get(playerId);
      if (!player || player.isDead) return;

      const cost = 1;
      if (!player.inventory[Constants.Items.STONE] || player.inventory[Constants.Items.STONE] < cost) return;

      player.inventory[Constants.Items.STONE] -= cost;
      this.sendInventoryUpdate(player);

      const wall = new Wall(this.generateId(), buildData.x, buildData.y);
      this.createEntity(wall);
  }

  checkShooting(player, input) {
      if (input.isShooting) {
          const range = 50; 
          const angle = player.body.angle;
          const tipX = player.body.position[0] + Math.cos(angle) * range;
          const tipY = player.body.position[1] + Math.sin(angle) * range;

          for (const entity of this.entities.values()) {
              if (entity.id === player.id) continue;
              const dx = entity.body.position[0] - tipX;
              const dy = entity.body.position[1] - tipY;
              const dist = Math.sqrt(dx*dx + dy*dy);

              if (dist < 20) { 
                  if (entity.type === Constants.Entities.ASTEROID_COPPER || 
                      entity.type === Constants.Entities.ASTEROID_IRON) {
                      
                      const itemId = entity.type === Constants.Entities.ASTEROID_COPPER 
                          ? Constants.Items.COPPER_ORE 
                          : Constants.Items.STONE;
                      
                      if (!player.inventory[itemId]) player.inventory[itemId] = 0;
                      player.inventory[itemId]++;
                      this.sendInventoryUpdate(player);
                      this.removeEntity(entity.id);
                  }
                  break; 
              }
          }
      }
  }

  sendInventoryUpdate(player) {
      this.server.send(player.id, 'inventory', { items: player.inventory });
  }

  loop() {
    const now = Date.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.accumulator += dt;

    while (this.accumulator >= this.stepSize) {
      this.fixedUpdate(this.stepSize);
      this.accumulator -= this.stepSize;
    }
    this.networkUpdate();
    setTimeout(() => this.loop(), 1000 / 60);
  }

  fixedUpdate(dt) {
    this.inputs.forEach((input, playerId) => {
      const player = this.players.get(playerId);
      if (player) {
        player.applyInput(input);
        this.checkShooting(player, input);
      }
    });
    this.world.step(dt);
    this.players.forEach(player => {
        if (player.update) player.update(dt);
    });
  }

  networkUpdate() {
    const entitiesData = [];
    this.entities.forEach(entity => {
        if (entity.serialize) {
            entitiesData.push(entity.serialize());
        }
    });

    // [診斷 Log] 每 60 幀 (約1秒) 印一次狀態，避免洗版
    if (Math.random() < 0.016) { 
        console.log(`[Game] Ticking. Entities count: ${this.entities.size}, Players: ${this.players.size}`);
    }

    const worldState = {
        time: Date.now(),
        entities: entitiesData
    };

    this.server.broadcast('worldState',  worldState );
  }
}

module.exports = Game;