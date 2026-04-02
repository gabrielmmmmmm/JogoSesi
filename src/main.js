import { BootScene } from './scenes/BootScene.js';
import { IntroScene } from './scenes/IntroScene.js';
import { LevelScene } from './scenes/LevelScene.js';
import { BossScene } from './scenes/BossScene.js';
import { WorldMapScene } from './scenes/WorldMapScene.js';
import { OdsUnlockScene } from './scenes/OdsUnlockScene.js';
import { EndingScene } from './scenes/EndingScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0e10',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1200 },
      debug: false,
    },
  },
  scene: [BootScene, IntroScene, WorldMapScene, LevelScene, BossScene, OdsUnlockScene, EndingScene, GameOverScene],
};

new Phaser.Game(config);
