const uWS = require('uWebSockets.js');
const { Constants, Protocol } = require('@voidworks/common'); 
const Game = require('./Game');

// 強制轉型 Port 為整數，防止字串導致的監聽失敗
const port = parseInt(process.env.PORT || Constants.DEFAULT_PORT || 8080, 10);

class Server {
  constructor() {
    this.game = new Game();
    this.app = uWS.App();
    // 移除 this.sockets = new Map(); // 讓 Game.js 自己管理
  }

  start() {
    this.app.ws('/*', {
      compression: uWS.SHARED_COMPRESSOR,
      maxPayloadLength: 16 * 1024,
      idleTimeout: 32,
      
      open: (ws) => {
        console.log('Client connected');
        ws.getUserData().id = null;
      },
      
      message: (ws, message, isBinary) => {
        try {
            const buffer = new Uint8Array(message);
            const clientMsg = Protocol.decodeClientPacket(buffer);
            // 直接呼叫 Game 的處理函式
            this.game.handleMessage(ws, clientMsg);
        } catch(e) {
            console.error('Decode error:', e);
        }
      },
      
      close: (ws, code, message) => {
        const userId = ws.getUserData().id;
        if (userId) {
            this.game.removePlayer(userId);
        }
      }
    }).listen(port, (token) => {
      if (token) {
        console.log(`[Server] Listening on port ${port}`);
        this.game.start();
      } else {
        console.error(`[Server] Failed to listen to port ${port}.`);
        // 備用方案：嘗試監聽 Localhost
        this.app.listen('127.0.0.1', port, (token2) => {
            if (token2) {
                console.log(`[Server] Listening on 127.0.0.1:${port} (Fallback)`);
                this.game.start();
            } else {
                console.error(`[Server] Fatal: Could not bind port ${port}. Is it already in use?`);
                process.exit(1);
            }
        });
      }
    });
  }
}

if (require.main === module) {
    new Server().start();
}

module.exports = Server;