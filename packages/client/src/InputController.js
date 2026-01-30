import * as CommonPkg from '@voidworks/common';
import AudioManager from './AudioManager';

const { Protocol, Constants } = CommonPkg.default || CommonPkg;

class InputController {
  constructor(gameClient) {
    this.client = gameClient;
    
    this.state = {
      up: false, down: false, left: false, right: false,
      mouseAngle: 0, isShooting: false
    };

    this.isBuildMode = false;
    this.buildType = Constants.Entities.WALL;
    this.mouseScreenX = 0;
    this.mouseScreenY = 0;

    this.initListeners();
    // 60Hz
    this.inputInterval = setInterval(() => this.sendInput(), 1000 / 60); 
  }

  initListeners() {
    const keyMap = {
      'w': 'up', 'a': 'left', 's': 'down', 'd': 'right',
      'ArrowUp': 'up', 'ArrowLeft': 'left', 'ArrowDown': 'down', 'ArrowRight': 'right'
    };

    window.addEventListener('keydown', (e) => {
      if (keyMap[e.key]) this.state[keyMap[e.key]] = true;
      if (e.key === 'b' || e.key === 'B') {
          this.toggleBuildMode();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (keyMap[e.key]) this.state[keyMap[e.key]] = false;
    });

    window.addEventListener('mousemove', (e) => {
        this.mouseScreenX = e.clientX;
        this.mouseScreenY = e.clientY;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        this.state.mouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    });

    window.addEventListener('mousedown', () => { 
        if (this.isBuildMode) {
            this.requestBuild();
        } else {
            this.state.isShooting = true; 
        }
    });
    
    window.addEventListener('mouseup', () => { this.state.isShooting = false; });
  }

  toggleBuildMode() {
      this.isBuildMode = !this.isBuildMode;
      if (this.client.renderer) {
          this.client.renderer.setBuildMode(this.isBuildMode, this.buildType);
      }
  }

  requestBuild() {
    if (!this.client.isConnected) return;
    
    // Transform coordinates using Renderer
    const worldPos = this.client.renderer.getMouseWorldPos(this.mouseScreenX, this.mouseScreenY);
    if (!worldPos) return;

    const buffer = Protocol.encodeClientPacket({
        build: {
            type: this.buildType,
            x: worldPos.x,
            y: worldPos.y,
            angle: 0
        }
    });
    this.client.send(buffer);
    AudioManager.play('build');
  }

  sendInput() {
    if (!this.client.isConnected) return;
    const buffer = Protocol.encodeClientPacket({ input: this.state });
    this.client.send(buffer);
  }
}

export default InputController;