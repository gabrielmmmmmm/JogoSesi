export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.load.on('loaderror', () => {
      // Optional assets may be missing; game should still run.
    });

    const title = this.add
      .text(w / 2, h / 2 - 30, 'SESI', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '44px',
        fontStyle: '800',
        color: '#e8e8e8',
        letterSpacing: '2px',
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(w / 2, h / 2 + 18, 'Carregando…', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '16px',
        color: 'rgba(232,232,232,0.75)',
      })
      .setOrigin(0.5);

    const barBg = this.add
      .rectangle(w / 2, h / 2 + 60, 520, 12, 0x111418)
      .setStrokeStyle(1, 0x2b3138, 1)
      .setOrigin(0.5);

    const bar = this.add
      .rectangle(w / 2 - 260, h / 2 + 60, 0, 10, 0x7bd389)
      .setOrigin(0, 0.5);

    this.load.on('progress', (p) => {
      bar.width = Math.floor(520 * p);
    });

    this.load.on('complete', () => {
      title.destroy();
      subtitle.destroy();
      barBg.destroy();
      bar.destroy();
    });

    // Placeholder tiny audio, sprites etc could be loaded here later.
    // For now we keep zero external assets to ensure it runs anywhere.

    // Optional: if you add the uploaded images into ./assets, they will be used as backgrounds.
    this.load.image('bg_factory_1', './assets/bg_factory_1.png');
    this.load.image('bg_factory_2', './assets/bg_factory_2.png');

    // Simulate minimal load so the bar animates.
    this.load.image('pixel', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/UD9R2kAAAAASUVORK5CYII=');
  }

  create() {
    this.scene.start('Intro');
  }
}
