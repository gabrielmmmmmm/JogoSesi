export class HUD {
  constructor(scene) {
    this.scene = scene;

    if (!scene.textures.exists('lifeIcon')) {
      const g = scene.add.graphics();
      g.fillStyle(0x111418, 1);
      g.fillCircle(10, 10, 10);
      g.fillStyle(0xf6c177, 1);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const x = 10 + Math.cos(a) * 9;
        const y = 10 + Math.sin(a) * 9;
        g.fillCircle(x, y, 2.2);
      }
      g.fillStyle(0x7bd389, 1);
      g.fillCircle(10, 10, 4.6);
      g.generateTexture('lifeIcon', 20, 20);
      g.destroy();
    }

    this.container = scene.add.container(0, 0).setScrollFactor(0);

    this.bg = scene.add
      .rectangle(12, 12, 310, 54, 0x000000, 0.35)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xffffff, 0.08);

    this.hpText = scene.add.text(22, 20, '', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      fontSize: '14px',
      color: 'rgba(234,234,234,0.9)',
    });

    this.weaponText = scene.add.text(22, 38, '', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      fontSize: '14px',
      color: 'rgba(234,234,234,0.75)',
    });

    this.levelText = scene.add.text(scene.scale.width - 12, 18, '', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      fontSize: '14px',
      color: 'rgba(234,234,234,0.65)',
    });
    this.levelText.setOrigin(1, 0);
    this.levelText.setScrollFactor(0);

    this.livesIcon = scene.add.image(270, 38, 'lifeIcon').setOrigin(0, 0.5);
    this.livesIcon.setAlpha(0.9);
    this.livesText = scene.add.text(292, 31, '', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      fontSize: '14px',
      color: 'rgba(234,234,234,0.85)',
    });

    this.container.add([this.bg, this.hpText, this.weaponText]);
    this.container.add([this.livesIcon, this.livesText]);

    this.help = scene.add
      .text(12, scene.scale.height - 10, '', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '13px',
        color: 'rgba(234,234,234,0.6)',
      })
      .setOrigin(0, 1)
      .setScrollFactor(0);

    this._helpTimeout = null;

    this._bigAlert = null;
    this._bigAlertTween = null;
  }

  setHelp(text, ms = 3500) {
    this.help.setText(text);
    if (this._helpTimeout) this._helpTimeout.remove(false);
    this._helpTimeout = this.scene.time.delayedCall(ms, () => {
      this.help.setText('');
    });
  }

  showBigAlert(text, ms = 1800) {
    const { width: w, height: h } = this.scene.scale;

    if (!this._bigAlert) {
      const bg = this.scene.add
        .rectangle(w / 2, h / 2, Math.min(760, w - 40), 86, 0x000000, 0.65)
        .setStrokeStyle(2, 0xffffff, 0.14)
        .setScrollFactor(0);

      const label = this.scene.add
        .text(w / 2, h / 2, '', {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
          fontSize: '34px',
          fontStyle: '900',
          align: 'center',
          color: '#eaeaea',
        })
        .setOrigin(0.5)
        .setScrollFactor(0);

      this._bigAlert = this.scene.add.container(0, 0, [bg, label]).setDepth(9999);
      this._bigAlert._bg = bg;
      this._bigAlert._label = label;
    }

    this._bigAlert._label.setText(text);
    this._bigAlert.setVisible(true);
    this._bigAlert.setAlpha(0);
    this._bigAlert.setScale(0.92);

    if (this._bigAlertTween) this._bigAlertTween.stop();

    this._bigAlertTween = this.scene.tweens.add({
      targets: this._bigAlert,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.92, to: 1 },
      duration: 180,
      ease: 'Back.Out',
      yoyo: true,
      hold: Math.max(0, ms - 360),
      onComplete: () => {
        if (!this._bigAlert) return;
        this._bigAlert.setVisible(false);
      },
    });
  }

  update({ hp, hpMax, weapon, levelName, lives, livesMax }) {
    const hearts = '█'.repeat(hp) + '░'.repeat(Math.max(0, hpMax - hp));
    this.hpText.setText(`Vida: ${hearts}`);
    this.weaponText.setText(
      `Ferramenta: ${weapon === 'shotgun' ? 'Reciclagem de Metal' : 'Reciclagem de Orgânico'} | Usar: Espaço`,
    );
    if (Number.isFinite(lives)) {
      const max = Number.isFinite(livesMax) ? livesMax : 7;
      this.livesText.setText(`Vidas: ${Math.max(0, lives)}/${max}`);
      this.livesIcon.setVisible(true);
      this.livesText.setVisible(true);
    } else {
      this.livesIcon.setVisible(false);
      this.livesText.setVisible(false);
    }
    if (typeof levelName === 'string') {
      this.levelText.setText(levelName);
    }
  }
}
