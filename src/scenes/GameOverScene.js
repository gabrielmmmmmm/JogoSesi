import { GameState } from '../state/GameState.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
    this._armed = false;
  }

  create() {
    const { width: w, height: h } = this.scale;

    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 1);

    const title = this.add
      .text(w / 2, h * 0.42, 'GAME OVER', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '84px',
        fontStyle: '900',
        color: '#ff4d4d',
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(w / 2, h * 0.60, 'Seu progresso foi perdido. ENTER para recomeçar', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '18px',
        color: 'rgba(234,234,234,0.8)',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scale: { from: 0.94, to: 1.02 },
      duration: 420,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: subtitle,
      alpha: { from: 0.35, to: 1 },
      duration: 650,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });

    this._keys = this.input.keyboard.addKeys({
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    this._start = () => {
      if (this._armed) return;
      this._armed = true;
      GameState.reset();
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.time.delayedCall(380, () => {
        this.scene.start('Intro');
      });
    };

    this.input.keyboard.on('keydown-ENTER', this._start);
    this.input.keyboard.on('keydown-SPACE', this._start);

    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  update() {
    if (this._armed) return;
    if (!this._keys) return;
    if (this._keys.enter?.isDown || this._keys.space?.isDown) {
      this._start();
    }
  }
}
