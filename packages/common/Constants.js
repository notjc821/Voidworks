module.exports = {
  // Physics & Game Loop
  PHYSICS_TPS: 60,
  PHYSICS_STEP: 1 / 60,
  
  // World
  TILE_SIZE: 32,
  CHUNK_SIZE: 16,
  MAP_WIDTH: 64, 
  MAP_HEIGHT: 64,
  
  // Network
  DEFAULT_PORT: 8080,
  
  // Collision Tags (Bitmasks)
  Tags: {
    PLAYER: 1,
    WALL: 2,
    PROJECTILE: 4,
    ITEM: 8
  },

  // [NEW] Entity Types
  Entities: {
    PLAYER: 1,
    WALL: 2,
    ASTEROID_COPPER: 3,
    ASTEROID_IRON: 4,
    FLOOR: 5, // 雖然地板通常是 tile，但有時作為實體處理
    BULLET: 6
  },

  // [NEW] Item IDs
  Items: {
    STONE: 1,
    COPPER_ORE: 2,
    IRON_ORE: 3,
    WALL_ITEM: 4,
  },

  // [NEW] Tiles (Terrain)
  Tiles: {
    SPACE: 0,
    FLOOR: 1,
    WALL: 2
  },

  // [NEW] Build Costs (EntityID -> { ItemID: Count })
  BuildCost: {
    2: { 4: 1 }, 
  },

  UI: {
    INVENTORY_WIDTH: 9,
    INVENTORY_HEIGHT: 4,
    SLOT_SIZE: 50,
    PADDING: 10
  },

  RECIPES: [
    { 
      id: 1, 
      result: 'Wall', 
      rresultId: 4,   // [修正 1] 合成出來的是 WALL_ITEM (4)，不再是 2
      count: 1, 
      ingredients: { 1: 5 } // 需要 5 個 Stone (1)
    }
  ],

  BUILD_DISTANCE: 200,
};