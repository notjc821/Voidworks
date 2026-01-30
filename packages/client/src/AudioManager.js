import { Howl } from 'howler';

class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.muted = false;
  }

  load() {
    const manifest = {
      'build': '/assets/sounds/build.mp3',
      'hit': '/assets/sounds/hit.mp3'
    };

    console.log('[AudioManager] Loading sounds...');

    Object.entries(manifest).forEach(([key, path]) => {
      const sound = new Howl({
        src: [path],
        volume: 0.5, // volume 50%
        onload: () => console.log(`[AudioManager] Loaded: ${key}`),
        onloaderror: (id, err) => console.warn(`[AudioManager] Failed to load ${key}:`, err)
      });
      this.sounds.set(key, sound);
    });
  }

  play(key) {
    if (this.muted) return;
    
    const sound = this.sounds.get(key);
    if (sound) {
        // Slightly randomize the pitch (0.9 ~ 1.1) to make the repetitive sound effects sound less monotonous.
        sound.rate(0.9 + Math.random() * 0.2);
        sound.play();
    } else {
        console.warn(`[AudioManager] Sound not found: ${key}`);
    }
  }
}

export default new AudioManager();