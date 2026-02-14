const { v4: uuidv4 } = require('uuid');
const p2 = require('p2');
const ChunkManager = require('./map/ChunkManager');
const { Constants, Protocol } = require('@voidworks/common');
const Player = require('./entities/Player');
const Wall = require('./entities/Wall');
const Asteroid = require('./entities/Asteroid');

class Game {
  constructor() {
    this.world = new p2.World({ gravity: [0, 0] });
    this.players = new Map();
    this.entities = new Map();
    this.sockets = new Map(); 
    this.nextEntityId = 1;

    this.chunkManager = new ChunkManager(this);
    this.loop = null;
    
    // [Phase 12.3] 清理計時器
    this.cleanupTimer = 0;
  }

  generateId() {
    return this.nextEntityId++;
  }

  createEntity(entity) {
    this.entities.set(entity.id, entity);
    if (entity.body) {
      this.world.addBody(entity.body);
      entity.body.entity = entity;
    }
  }

  removeEntity(id) {
    const entity = this.entities.get(id);
    if (entity) {
      if (entity.body) {
        this.world.removeBody(entity.body);
      }
      this.entities.delete(id);
    }
  }

  join(playerId, name) {
    const player = new Player(playerId, 0, 0);
    player.name = name;
    
    player.inventory = new Map();
    player.inventory.set(Constants.Items.PICKAXE, 1);
    player.inventory.set(Constants.Items.WELDER, 1);
    player.inventory.set(Constants.Items.STONE, 10);

    this.createEntity(player);
    this.players.set(playerId, player);
    
    this.chunkManager.updatePlayerChunks(player);
    this.sendInventoryUpdate(player);
    
    return player;
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      this.removeEntity(player.id);
      this.players.delete(playerId);
      this.sockets.delete(playerId);
      console.log(`[Game] Player ${player.name} disconnected.`);
    }
  }

  handleMessage(ws, msg) {
    const userId = ws.getUserData().id;
    
    if (msg.handshake) {
        this.handleHandshake(ws, msg.handshake);
        return;
    }

    const player = this.players.get(userId);
    if (!player) return;

    if (msg.input) {
        player.inputState = msg.input;
        this.handleToolUse(player, msg.input);
    } else if (msg.build) {
        this.handleBuild(player.id, msg.build);
    } else if (msg.craft) {
        this.handleCraft(player.id, msg.craft);
    } else if (msg.requestChunk) {
        this.handleRequestChunk(player, msg.requestChunk);
    }
  }

  handleHandshake(ws, packet) {
      const playerId = uuidv4();
      ws.getUserData().id = playerId;
      this.sockets.set(playerId, ws);
      
      console.log(`[Game] Handshake received from ${packet.name} (${playerId})`);
      
      const welcome = { welcome: { playerId: String(playerId) } };
      ws.send(Protocol.encodeServerPacket(welcome), true);

      this.join(playerId, packet.name);
  }

  handleRequestChunk(player, req) {
      const chunk = this.chunkManager.getChunk(req.chunkX, req.chunkY);
      const chunkPacket = {
          chunkData: {
              chunkX: chunk.x,
              chunkY: chunk.y,
              tiles: chunk.tiles
          }
      };
      this.sendTo(player, chunkPacket);
  }

  handleToolUse(player, input) {
      if (!input.isShooting) return;

      const now = Date.now();
      const items = Array.from(player.inventory.entries());
      const selectedSlot = input.selectedSlot || 0;
      
      let toolId = 0;
      if (selectedSlot < items.length) {
          toolId = items[selectedSlot][0];
      }

      const toolStats = Constants.ToolStats[toolId];
      if (!toolStats) return;

      if (now - player.lastActionTime < toolStats.cooldown) return;
      player.lastActionTime = now;

      const range = toolStats.range;
      const angle = input.mouseAngle;
      const tipX = player.body.position[0] + Math.cos(angle) * range;
      const tipY = player.body.position[1] + Math.sin(angle) * range;

      for (const entity of this.entities.values()) {
          if (entity.id === player.id) continue;
          
          const dx = entity.body.position[0] - tipX;
          const dy = entity.body.position[1] - tipY;
          
          if (Math.sqrt(dx*dx + dy*dy) < 30) {
              this.damageEntity(player, entity, toolStats.power);
              break;
          }
      }
  }

  damageEntity(player, entity, damage) {
      const stats = Constants.BlockRegistry[entity.type];
      if (!stats) return;

      entity.health -= damage;

      if (entity.health <= 0) {
          if (stats.drop) {
              const current = player.inventory.get(stats.drop) || 0;
              player.inventory.set(stats.drop, current + 1);
              this.sendInventoryUpdate(player);
          }
          this.removeEntity(entity.id);
      }
  }

  handleBuild(playerId, buildData) {
      const player = this.players.get(playerId);
      if (!player || player.isDead) return;

      const type = buildData.type || Constants.Entities.WALL;
      const dist = Math.hypot(buildData.x - player.body.position[0], buildData.y - player.body.position[1]);
      if (dist > Constants.BUILD_DISTANCE) return;

      for (const entity of this.entities.values()) {
          const d = Math.hypot(entity.body.position[0] - buildData.x, entity.body.position[1] - buildData.y);
          if (d < 20) return;
      }

      const costConfig = Constants.BuildCost[type];
      if (!costConfig) return;

      for (const [itemId, amount] of Object.entries(costConfig)) {
          const has = player.inventory.get(parseInt(itemId)) || 0;
          if (has < amount) return;
      }
      for (const [itemId, amount] of Object.entries(costConfig)) {
          const has = player.inventory.get(parseInt(itemId));
          player.inventory.set(parseInt(itemId), has - amount);
      }
      this.sendInventoryUpdate(player);

      if (type === Constants.Entities.WALL) {
          const wall = new Wall(this.generateId(), buildData.x, buildData.y);
          this.createEntity(wall);
      }
  }

  handleCraft(playerId, craftReq) {
      // 待實作
  }

  start() {
    console.log('[Game] Engine starting...');
    let lastTime = Date.now();
    
    this.loop = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      this.fixedUpdate(dt);
    }, 1000 / Constants.Physics.TPS);
  }

  fixedUpdate(dt) {
    this.world.step(Constants.Physics.STEP);

    this.players.forEach(player => {
        player.applyInput(player.inputState);
        player.update(dt);
        this.chunkManager.updatePlayerChunks(player);
    });

    // [Phase 12.3] 定期清理伺服器區塊 (每 5 秒)
    this.cleanupTimer += dt;
    if (this.cleanupTimer > 5) {
        this.chunkManager.cleanupChunks();
        this.cleanupTimer = 0;
    }

    const entityData = [];
    this.entities.forEach(e => {
        if (e.serialize) entityData.push(e.serialize());
    });

    const statePacket = {
        worldState: {
            time: Date.now(),
            entities: entityData
        }
    };
    
    this.broadcast(statePacket);
  }

  sendInventoryUpdate(player) {
      const update = {
          inventory: {
              items: Object.fromEntries(player.inventory)
          }
      };
      this.sendTo(player, update);
  }

  sendTo(player, packet) {
      const ws = this.sockets.get(player.id);
      if (ws) {
          ws.send(Protocol.encodeServerPacket(packet), true);
      }
  }

  broadcast(packet) {
      const buffer = Protocol.encodeServerPacket(packet);
      this.sockets.forEach(ws => {
          ws.send(buffer, true);
      });
  }
}

module.exports = Game;