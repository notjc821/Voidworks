require('dotenv').config();
const Server = require('./Server');
const mysql = require('mysql2/promise');
const { Protocol } = require('@voidworks/common');

async function init() {
  console.log('[System] Initializing VoidWorks Server...');

  try {
  // 1. Load Protocol Buffers FIRST
  await Protocol.load();
  console.log('[Common] Protocol Buffers loaded successfully.');

  // 2. Test Database Connection
  console.log('[System] Connecting to database...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });
    console.log('[System] Database connection successful!');
    await connection.end();
  } catch (error) {
    console.error('[Error] Database connection failed:', error.message);
    // Don't crash for now if DB fails, keep server running for testing
  }

  // 3. Start Game Server
  const server = new Server();
  server.start(); 

    } catch (error) {
      console.error('[System] Fatal Error during startup:', error);
      process.exit(1);
    }
  }

init();