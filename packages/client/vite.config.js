import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  optimizeDeps: {
    include: ['@voidworks/common', 'protobufjs']
  },
  build: {
    commonjsOptions: {
      include: [/packages\/common/, /node_modules/]
    }
  },
  resolve: {
    alias: {
      '@voidworks/common': resolve(__dirname, '../common')
    }
  }
});