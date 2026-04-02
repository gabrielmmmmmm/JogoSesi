import { AudioManager } from '../audio/AudioManager.js';

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

export class IntroScene extends Phaser.Scene {
  constructor() {
    super('Intro');
    this._skipArmed = false;
  }

  create() {
    this._skipArmed = false;
    const { width: w, height: h } = this.scale;

    // Background gradient-like panels
    this.add.rectangle(w / 2, h / 2, w, h, 0x07090b);
    this.add.rectangle(w / 2, h / 2, w, h * 0.65, 0x0b0e10).setAlpha(0.8);

    // Subtle moving fog/particles (procedural)
    const particles = this.add.particles(0, 0, 'pixel', {
      x: { min: -40, max: w + 40 },
      y: { min: 0, max: h },
      lifespan: { min: 4000, max: 8000 },
      speedX: { min: -10, max: 10 },
      speedY: { min: -5, max: -18 },
      scale: { start: 1.6, end: 0.1 },
      alpha: { start: 0.10, end: 0 },
      quantity: 2,
      frequency: 45,
      tint: [0x1f2a1f, 0x1a222a, 0x2a1f1f],
      blendMode: 'ADD',
    });

    particles.setDepth(1);

    // Dark vignette
    const vignette = this.add
      .rectangle(w / 2, h / 2, w, h, 0x000000)
      .setAlpha(0.55);
    vignette.setDepth(2);

    // Title
    const title = this.add
      .text(w * 0.08, h * 0.22, 'MISSÃO INDÚSTRIA', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '42px',
        fontStyle: '900',
        color: '#eaeaea',
      })
      .setDepth(3);

    const tagline = this.add
      .text(
        w * 0.08,
        h * 0.22 + 78,
        'Quando os recursos acabam, cada escolha pesa.',
        {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
          fontSize: '18px',
          color: 'rgba(234,234,234,0.75)',
        },
      )
      .setDepth(3);

    // Story block
    const story =
      'Os tempos passaram.\n' +
      'A humanidade sobreviveu, mas os recursos naturais agora são raros.\n\n' +
      'Você entra em uma fábrica abandonada — um lugar que esconde\n' +
      'respostas… e perigos.';

    const storyText = this.add
      .text(w * 0.08, h * 0.48, story, {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '18px',
        lineSpacing: 10,
        color: 'rgba(234,234,234,0.85)',
      })
      .setDepth(3);

    // Controls hint
    const hint = this.add
      .text(w * 0.08, h * 0.83, 'Pressione ENTER para começar', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '16px',
        color: 'rgba(234,234,234,0.7)',
      })
      .setDepth(3);

    // Film grain / noise simulation (small rectangles)
    const noise = this.add.graphics().setDepth(4);
    const noiseSeed = { t: 0 };

    this.tweens.add({
      targets: noiseSeed,
      t: 1,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.events.on('postupdate', () => {
      // Light-weight noise
      noise.clear();
      noise.fillStyle(0xffffff, 0.03 + 0.02 * clamp01(noiseSeed.t));
      for (let i = 0; i < 110; i++) {
        const x = (Math.random() * w) | 0;
        const y = (Math.random() * h) | 0;
        const s = 1 + ((Math.random() * 2) | 0);
        noise.fillRect(x, y, s, s);
      }
    });

    // Pulse hint
    this.tweens.add({
      targets: hint,
      alpha: { from: 0.45, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // Input
    this._keys = this.input.keyboard.addKeys({
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    this._start = () => {
      if (this._skipArmed) return;
      this._skipArmed = true;
      AudioManager.unlock();
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.start('WorldMap');
      });
    };

    if (this._keyEnterHandler) this.input.keyboard.off('keydown-ENTER', this._keyEnterHandler);
    if (this._keySpaceHandler) this.input.keyboard.off('keydown-SPACE', this._keySpaceHandler);
    this._keyEnterHandler = () => this._start();
    this._keySpaceHandler = () => this._start();

    this.input.keyboard.on('keydown-ENTER', this._keyEnterHandler);
    this.input.keyboard.on('keydown-SPACE', this._keySpaceHandler);

    this.events.once('shutdown', () => {
      if (this._keyEnterHandler) this.input.keyboard.off('keydown-ENTER', this._keyEnterHandler);
      if (this._keySpaceHandler) this.input.keyboard.off('keydown-SPACE', this._keySpaceHandler);
    });

    this.cameras.main.fadeIn(650, 0, 0, 0);
  }

  update() {
    if (this._skipArmed) return;
    if (!this._keys) return;
    if (this._keys.enter?.isDown || this._keys.space?.isDown) {
      this._start();
    }
  }
}
