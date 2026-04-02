import { GameState } from '../state/GameState.js';
import { odsInfo } from '../ods/ods.js';

export class OdsUnlockScene extends Phaser.Scene {
  constructor() {
    super('OdsUnlock');
  }

  init(data) {
    this.phaseIndex = typeof data?.phaseIndex === 'number' ? data.phaseIndex : 0;
  }

  create() {
    const { width: w, height: h } = this.scale;

    const info = odsInfo(this.phaseIndex);
    const titleText = info ? `${info.short}: ${info.title}` : '';
    const descText = info?.description ?? '';

    this.add.rectangle(w / 2, h / 2, w, h, 0x07090b);
    this.add.rectangle(w / 2, h / 2, w, h * 0.7, 0x0b0e10).setAlpha(0.88);

    this.add
      .text(w / 2, h * 0.25, 'ODS DESBLOQUEADA', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '34px',
        fontStyle: '900',
        color: '#eaeaea',
      })
      .setOrigin(0.5);

    const cardW = Math.min(840, w * 0.92);
    const cardH = 190;
    const cardX = w / 2;
    const cardY = h * 0.50;

    this.add
      .rectangle(cardX + 10, cardY + 12, cardW, cardH, 0x000000, 0.22)
      .setOrigin(0.5);

    this.add
      .rectangle(cardX, cardY, cardW, cardH, 0x111418, 1)
      .setStrokeStyle(2, 0x2b3138, 1)
      .setOrigin(0.5);

    const badge = this.add
      .text(cardX - cardW / 2 + 26, cardY - cardH / 2 + 22, info ? `${info.short}` : 'ODS', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '14px',
        fontStyle: '900',
        color: 'rgba(234,234,234,0.9)',
        backgroundColor: 'rgba(123,211,137,0.16)',
        padding: { left: 10, right: 10, top: 6, bottom: 6 },
      })
      .setOrigin(0, 0);

    this.add
      .text(badge.x, badge.y + 46, titleText, {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '20px',
        fontStyle: '900',
        color: '#eaeaea',
        wordWrap: { width: cardW - 52, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);

    this.add
      .text(badge.x, badge.y + 86, descText, {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '16px',
        color: 'rgba(234,234,234,0.78)',
        lineSpacing: 7,
        wordWrap: { width: cardW - 52, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);

    const state = GameState.load();
    const count = state.odsUnlocked.filter(Boolean).length;

    this.add
      .text(w / 2, h * 0.70, `Progresso: ${count}/10`, {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '16px',
        color: 'rgba(234,234,234,0.7)',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.82, 'Pressione ENTER para voltar ao mapa', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '16px',
        color: 'rgba(234,234,234,0.7)',
      })
      .setOrigin(0.5);

    this.keys = this.input.keyboard.addKeys({
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.enter) || Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      this.scene.start('WorldMap');
    }
  }
}
