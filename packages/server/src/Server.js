const uWS = require('uWebSockets.js');
const { Protocol } = require('@voidworks/common');
const Game = require('./Game');

const port = 8080;

class Server {
  constructor() {
    // 這裡只負責建立 Game 實例，不啟動迴圈
    this.game = new Game(this);
    this.clients = new Map(); // ws -> playerId

    this.app = uWS.App().ws('/*', {
      compression: uWS.SHARED_COMPRESSOR,
      maxPayloadLength: 1024 * 1024,
      idleTimeout: 60,

      open: (ws) => {
        console.log('A WebSocket connected!');
        ws.binaryType = 'arraybuffer';
      },

      message: (ws, message, isBinary) => {
        if (!isBinary) return;
        
        try {
          const buffer = new Uint8Array(message);
          const packet = Protocol.decodeClientPacket(buffer);
          this.handlePacket(ws, packet);
        } catch (e) {
          console.error('Failed to decode packet:', e);
        }
      },

      close: (ws, code, message) => {
        const playerId = this.clients.get(ws);
        if (playerId) {
          console.log(`Player ${playerId} disconnected`);
          this.game.leave(playerId);
          this.clients.delete(ws);
        }
      }
    }).listen(port, (token) => {
      if (token) {
        console.log(`[VoidWorks] Server listening on port ${port}`);
      } else {
        console.log(`[VoidWorks] Failed to listen to port ${port}`);
      }
    });

    // 載入 Protocol 後，才啟動遊戲
    Protocol.load().then(() => {
        console.log('[VoidWorks] Protocol loaded.');
        this.game.start(); 
    });
  }

  handlePacket(ws, packet) {
    if (packet.packet === 'handshake') {
      const playerId = this.game.generateId();
      const name = packet.handshake.name;
      
      this.clients.set(ws, playerId);
      this.game.join(playerId, name);

      this.send(playerId, 'welcome', { playerId });
      this.send(playerId, 'mapData', this.game.mapData);
    }
    
    const playerId = this.clients.get(ws);
    if (playerId) {
        if (packet.packet === 'input') {
            this.game.handleInput(playerId, packet.input);
        }
        else if (packet.packet === 'build') {
            this.game.handleBuild(playerId, packet.build);
        }
    }
  }

  send(playerId, type, payload) {
    for (const [ws, id] of this.clients.entries()) {
      if (id === playerId) {
        const buffer = Protocol.encodeServerPacket({ [type]: payload });
        ws.send(buffer, true);
        break;
      }
    }
  }

  broadcast(type, payload) {
    const buffer = Protocol.encodeServerPacket({ [type]: payload });
    for (const ws of this.clients.keys()) {
        ws.send(buffer, true);
    }
  }
}

// [修正重點] 這裡要是匯出類別，而不是 new Server()
module.exports = Server;