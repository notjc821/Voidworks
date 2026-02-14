const Physics = {
  TPS: 60,
  STEP: 1 / 60
};

const World = {
  TILE_SIZE: 32,
  CHUNK_SIZE: 32,
  MAP_WIDTH: 50,
  MAP_HEIGHT: 50
};

const Network = {
  DEFAULT_PORT: 8080
};

const UI = {
  INVENTORY_WIDTH: 9,
  INVENTORY_HEIGHT: 4,
  SLOT_SIZE: 50,
  PADDING: 10
};

module.exports = {
  Physics,
  World,
  Network,
  UI,

  PHYSICS_TPS: Physics.TPS,
  PHYSICS_STEP: Physics.STEP,
  TILE_SIZE: World.TILE_SIZE,
  CHUNK_SIZE: World.CHUNK_SIZE,
  MAP_WIDTH: World.MAP_WIDTH,
  MAP_HEIGHT: World.MAP_HEIGHT,
  DEFAULT_PORT: Network.DEFAULT_PORT,

  // --- 標籤與 ID ---
  Tags: { PLAYER: 1, WALL: 2, PROJECTILE: 4, ITEM: 8 },

  Entities: {
    PLAYER: 1,
    WALL: 2,
    STONE: 10,
    COPPER_ORE: 11,
    IRON_ORE: 12,
    ALUMINUM_ORE: 13,
    GOLD_ORE: 14,
    TITANIUM_ORE: 15,
    PLATINUM_ORE: 16,
    ASTEROID_ROCK: 20,
    ICE: 21,
    VOLCANIC: 22
  },

  Items: {
    STONE: 1,
    COPPER_ORE: 2,
    IRON_ORE: 3,
    ALUMINUM_ORE: 4,
    GOLD_ORE: 5,
    TITANIUM_ORE: 6,
    PLATINUM_ORE: 7,
    ICE: 8,
    
    WALL_ITEM: 50,

    PICKAXE: 100,
    WELDER: 101,
    GRAPPLE: 102
  },

  Tiles: { SPACE: 0, FLOOR: 1, WALL: 2 },

  // --- 屬性註冊表 ---
  ToolStats: {
    [100]: { type: 'mining', power: 10, range: 60, cooldown: 500, texture: 'Pickaxe' }, 
    [101]: { type: 'build', power: 5, range: 50, cooldown: 100, texture: 'Welder' },   
    [102]: { type: 'misc', range: 300, cooldown: 1000, texture: 'Grapple' }             
  },

  BlockRegistry: {
    2:  { name: 'Wall', texture: 'wall', maxHealth: 100, hardness: 1, drop: 50 }, 
    10: { name: 'Stone', texture: 'Stone', maxHealth: 50, hardness: 1, drop: 1 }, 
    11: { name: 'Copper Ore', texture: 'Copper Ore', maxHealth: 60, hardness: 2, drop: 2 },
    12: { name: 'Iron Ore', texture: 'Iron Ore', maxHealth: 80, hardness: 3, drop: 3 },
    13: { name: 'Aluminum Ore', texture: 'Aluminum Ore', maxHealth: 70, hardness: 2, drop: 4 },
    14: { name: 'Gold Ore', texture: 'Gold Ore', maxHealth: 50, hardness: 2, drop: 5 },
    15: { name: 'Titanium Ore', texture: 'Titanium Ore', maxHealth: 150, hardness: 5, drop: 6 },
    16: { name: 'Platinum Ore', texture: 'Platinum Ore', maxHealth: 120, hardness: 4, drop: 7 },
    20: { name: 'Asteroid Rock', texture: 'Asteroid Rock', maxHealth: 60, hardness: 1, drop: 1 },
    21: { name: 'Ice Layer', texture: 'Ice Layer', maxHealth: 20, hardness: 0, drop: 8 },
    22: { name: 'Volcanic Rock', texture: 'Volcanic Rock', maxHealth: 200, hardness: 5, drop: 1 }
  },

  BuildCost: {
    2: { 50: 1 } 
  },

  RECIPES: [
    { 
      id: 1, 
      result: 'Wall', 
      resultId: 50,   
      count: 1, 
      ingredients: { 1: 5 } 
    }
  ],

  BUILD_DISTANCE: 200,
};