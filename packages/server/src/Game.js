const { v4: uuidv4 } = require('uuid');
const p2 = require('p2');
const { Constants, Protocol } = require('../../common'); 
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

    this.initMap();
  }

  start() {
    console.log("[Game] Engine starting...");
    this.lastTime = Date.now();
    this.loop();
  }

  initMap() {
    console.log("[Game] Initializing Map via WorldGenerator...");
    const generator = new WorldGenerator(this);
    this.mapData = generator.generate(25); 
    console.log(`[Game] Map Generated. Size: ${this.mapData.width}x${this.mapData.height}`);
  }

  generateId() {
      return uuidv4(); 
  }
  
  createEntity(entity) {
      this.entities.set(entity.id, entity);
      if (entity.body) {
          this.world.addBody(entity.body);
      }
      return entity;
  }
  
  removeEntity(entityId) {
      const entity = this.entities.get(entityId);
      if (entity) {
          if (entity.body) {
              entity.body.velocity[0] = 0;
              entity.body.velocity[1] = 0;
              entity.body.shapes.forEach(shape => {
                  shape.collisionGroup = 0;
                  shape.collisionMask = 0;
              });
              this.world.removeBody(entity.body);
          }
          this.entities.delete(entityId);
          if (this.players.has(entityId)) {
              this.players.delete(entityId);
          }
      }
  }

  join(playerId, name) {
    const player = new Player(playerId, 0, 0);
    player.name = name;
    
    player.inventory = new Map();
    player.inventory.set(Constants.Items.STONE, 50);
    player.inventory.set(Constants.Items.COPPER_ORE, 0);


    this.createEntity(player);
    this.players.set(playerId, player);
    
    this.sendInventoryUpdate(player);
    
    return player;
  }

  leave(playerId) { this.removeEntity(playerId); }

  handleInput(playerId, inputData) { this.inputs.set(playerId, inputData); }

  handleCraftRequest(playerId, recipeId) {
      const player = this.players.get(playerId);
      if (!player || player.isDead) return;

      const recipe = Constants.RECIPES.find(r => r.id === recipeId);
      if (!recipe) return;

      // 1. check materials
      for (const [ingId, count] of Object.entries(recipe.ingredients)) {
          const currentQty = player.inventory.get(parseInt(ingId)) || 0;
          if (currentQty < count) return;
      }

      // 2. deduct materials
      for (const [ingId, count] of Object.entries(recipe.ingredients)) {
          const currentQty = player.inventory.get(parseInt(ingId));
          player.inventory.set(parseInt(ingId), currentQty - count);
      }

      // 3. add result
      const currentResult = player.inventory.get(recipe.resultId) || 0;
      player.inventory.set(recipe.resultId, currentResult + recipe.count);

      console.log(`[Game] Player ${player.id} crafted ${recipe.result}`);
      this.sendInventoryUpdate(player);
  }

  handleBuild(playerId, buildData) {
      const player = this.players.get(playerId);
      if (!player || player.isDead) return;

      const MAX_DIST = Constants.BUILD_DISTANCE || 200;
      const dx = buildData.x - player.body.position[0];
      const dy = buildData.y - player.body.position[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > MAX_DIST) return;

      const type = buildData.type || Constants.Entities.WALL;
      
      for (const entity of this.entities.values()) {
          const dx = entity.body.position[0] - buildData.x;
          const dy = entity.body.position[1] - buildData.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < 20) {
              return; 
          }
      }

      const costConfig = Constants.BuildCost[type];

      for (const [itemId, amount] of Object.entries(costConfig)) {
          const currentQty = player.inventory.get(parseInt(itemId)) || 0;
          if (currentQty < amount) return;
      }

      for (const [itemId, amount] of Object.entries(costConfig)) {
          const currentQty = player.inventory.get(parseInt(itemId));
          player.inventory.set(parseInt(itemId), currentQty - amount);
      }

      this.sendInventoryUpdate(player);

      if (type === Constants.Entities.WALL) {
          const wall = new Wall(this.generateId(), buildData.x, buildData.y);
          this.createEntity(wall);
      }
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
                      
                      const currentQty = player.inventory.get(itemId) || 0;
                      player.inventory.set(itemId, currentQty + 1);
                      
                      this.sendInventoryUpdate(player);
                      this.removeEntity(entity.id);
                  }
                  break; 
              }
          }
      }
  }

  sendInventoryUpdate(player) {
      const itemsObj = {};
      player.inventory.forEach((val, key) => {
          itemsObj[key] = val;
      });

       if (this.server.send) {
           this.server.send(player.id, 'inventory', { items: itemsObj });
       }
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

    const worldState = {
        time: Date.now(),
        entities: entitiesData
    };

    this.server.broadcast('worldState', worldState);
  }
}

module.exports = Game;