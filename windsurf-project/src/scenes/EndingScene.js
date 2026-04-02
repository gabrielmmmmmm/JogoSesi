import { GameState } from '../state/GameState.js';

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  create() {
    const { width: w, height: h } = this.scale;

    this.add.rectangle(w / 2, h / 2, w, h, 0x08140f);
    this.add.rectangle(w / 2, h / 2, w, h * 0.7, 0x0f2a1a).setAlpha(0.6);

    this.add
      .text(w / 2, h * 0.28, 'O MUNDO RESPIRA DE NOVO', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '34px',
        fontStyle: '900',
        color: '#eaeaea',
      })
      .setOrigin(0.5);

    this.add
      .text(
        w / 2,
        h * 0.48,
        'Com as 10 ODS conquistadas,\nrecursos naturais voltam ao normal\ne a humanidade recomeça com responsabilidade.',
        {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
          fontSize: '18px',
          lineSpacing: 10,
          align: 'center',
          color: 'rgba(234,234,234,0.85)',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.78, 'ENTER: Menu | R: Reset', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '16px',
        color: 'rgba(234,234,234,0.7)',
      })
      .setOrigin(0.5);

    this.keys = this.input.keyboard.addKeys({
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      r: Phaser.Input.Keyboard.KeyCodes.R,
    });
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      GameState.reset();
      this.scene.start('Intro');
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
      this.scene.start('Intro');
    }
  }
}
