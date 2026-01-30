const protobuf = require('protobufjs');

class Protocol {
  constructor() {
    this.root = null;
    this.ClientPacket = null;
    this.ServerPacket = null;
    this.isLoaded = false;
  }

  /**
   * Asynchronously loads the .proto definitions.
   * Compatible with both Node.js (Server) and Browser (Client).
   */
  async load() {
    if (this.isLoaded) return;

    try {
      // Check if we are running in the Browser
      if (typeof window !== 'undefined') {
        // [Browser] Load via HTTP fetch (served by Vite)
        // Note: 'voidworks.proto' must be in 'packages/client/public/protocol/'
        this.root = await protobuf.load("/protocol/voidworks.proto");
      } else {
        // [Node.js] Load via File System
        // We require 'path' here inside the else block to prevent
        // browser bundlers from crashing on the 'path' module.
        const path = require('path');
        const protoPath = path.join(__dirname, 'protocol', 'voidworks.proto');
        this.root = await protobuf.load(protoPath);
      }

      // Lookup and cache the main message types
      this.ClientPacket = this.root.lookupType("voidworks.ClientPacket");
      this.ServerPacket = this.root.lookupType("voidworks.ServerPacket");
      
      this.isLoaded = true;
      console.log('[Common] Protocol Buffers loaded successfully.');
    } catch (err) {
      console.error('[Common] Failed to load Protocol Buffers:', err);
      throw err;
    }
  }

  // -------------------------------------------------------
  // Encoding (Object -> Buffer)
  // -------------------------------------------------------

  encodeClientPacket(data) {
    const message = this.ClientPacket.create(data);
    return this.ClientPacket.encode(message).finish();
  }

  encodeServerPacket(data) {
    const message = this.ServerPacket.create(data);
    return this.ServerPacket.encode(message).finish();
  }

  // -------------------------------------------------------
  // Decoding (Buffer -> Object)
  // -------------------------------------------------------

  decodeClientPacket(buffer) {
    return this.ClientPacket.decode(buffer);
  }

  decodeServerPacket(buffer) {
    return this.ServerPacket.decode(buffer);
  }
}

// Export as a Singleton
module.exports = new Protocol();