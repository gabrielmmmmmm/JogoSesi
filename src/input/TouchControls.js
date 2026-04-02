export class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this._prev = {};
    this._state = {
      left: false,
      right: false,
      jump: false,
      crouch: false,
      shootShotgun: false,
      shootSmg: false,
    };

    const { width: w, height: h } = scene.scale;

    // weapon button icons
    if (!scene.textures.exists('icon_shotgun')) {
      const g = scene.add.graphics();
      g.fillStyle(0x111418, 1);
      g.fillRoundedRect(2, 8, 44, 18, 6);
      g.fillStyle(0x2a2f35, 1);
      g.fillRoundedRect(6, 12, 24, 10, 4);
      g.fillStyle(0xf6c177, 1);
      g.fillRoundedRect(28, 14, 16, 6, 3);
      g.fillStyle(0x7a5a2c, 1);
      g.fillRoundedRect(12, 22, 10, 14, 4);
      g.generateTexture('icon_shotgun', 48, 40);
      g.destroy();
    }
    if (!scene.textures.exists('icon_smg')) {
      const g = scene.add.graphics();
      g.fillStyle(0x111418, 1);
      g.fillRoundedRect(2, 10, 44, 16, 6);
      g.fillStyle(0x2a2f35, 1);
      g.fillRoundedRect(6, 13, 28, 10, 4);
      g.fillStyle(0xf6c177, 1);
      g.fillRoundedRect(34, 14, 10, 8, 3);
      g.fillStyle(0x7a5a2c, 1);
      g.fillRoundedRect(16, 22, 8, 14, 3);
      g.generateTexture('icon_smg', 48, 40);
      g.destroy();
    }

    const mkBtn = ({ x, y, w: bw, h: bh, label, key, fill = 0x111418 }) => {
      const c = scene.add.container(0, 0).setScrollFactor(0).setDepth(10000);
      const bg = scene.add
        .rectangle(x, y, bw, bh, fill, 0.55)
        .setStrokeStyle(2, 0xffffff, 0.14)
        .setScrollFactor(0);
      const txt = scene.add
        .text(x, y, label, {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
          fontSize: '16px',
          fontStyle: '900',
          color: 'rgba(234,234,234,0.85)',
        })
        .setOrigin(0.5)
        .setScrollFactor(0);

      c.add([bg, txt]);
      c.setSize(bw, bh);
      c.setInteractive(new Phaser.Geom.Rectangle(x - bw / 2, y - bh / 2, bw, bh), Phaser.Geom.Rectangle.Contains);

      const setDown = (down) => {
        this._state[key] = down;
        bg.setFillStyle(fill, down ? 0.85 : 0.55);
        bg.setStrokeStyle(2, down ? 0xf6c177 : 0xffffff, down ? 0.55 : 0.14);
      };

      c.on('pointerdown', () => setDown(true));
      c.on('pointerup', () => setDown(false));
      c.on('pointerout', () => setDown(false));
      c.on('pointerupoutside', () => setDown(false));

      return c;
    };

    const mkIconBtn = ({ x, y, w: bw, h: bh, texture, key, fill = 0x1a222a }) => {
      const c = scene.add.container(0, 0).setScrollFactor(0).setDepth(10000);
      const bg = scene.add
        .rectangle(x, y, bw, bh, fill, 0.55)
        .setStrokeStyle(2, 0xffffff, 0.14)
        .setScrollFactor(0);

      const icon = scene.add.image(x, y, texture).setScrollFactor(0).setOrigin(0.5);
      const scale = Math.min((bw - 16) / 48, (bh - 16) / 40);
      icon.setScale(scale);
      icon.setAlpha(0.92);

      c.add([bg, icon]);
      c.setSize(bw, bh);
      c.setInteractive(new Phaser.Geom.Rectangle(x - bw / 2, y - bh / 2, bw, bh), Phaser.Geom.Rectangle.Contains);

      const setDown = (down) => {
        this._state[key] = down;
        bg.setFillStyle(fill, down ? 0.85 : 0.55);
        bg.setStrokeStyle(2, down ? 0xf6c177 : 0xffffff, down ? 0.55 : 0.14);
        icon.setAlpha(down ? 1 : 0.92);
      };

      c.on('pointerdown', () => setDown(true));
      c.on('pointerup', () => setDown(false));
      c.on('pointerout', () => setDown(false));
      c.on('pointerupoutside', () => setDown(false));

      return c;
    };

    // Virtual analog joystick (Sonic 2-style)
    const joy = {
      baseX: 110,
      baseY: h - 96,
      radius: 54,
      knobRadius: 22,
      pointerId: null,
      knobX: 110,
      knobY: h - 96,
    };
    this._joy = joy;

    const joyG = scene.add.graphics().setScrollFactor(0).setDepth(10000);
    joyG.fillStyle(0x000000, 0.22);
    joyG.fillCircle(joy.baseX + 3, joy.baseY + 4, joy.radius);
    joyG.fillStyle(0x111418, 0.45);
    joyG.fillCircle(joy.baseX, joy.baseY, joy.radius);
    joyG.lineStyle(2, 0xffffff, 0.12);
    joyG.strokeCircle(joy.baseX, joy.baseY, joy.radius);
    joyG.lineStyle(2, 0xffffff, 0.10);
    joyG.strokeCircle(joy.baseX, joy.baseY, joy.radius * 0.52);

    const knob = scene.add
      .circle(joy.baseX, joy.baseY, joy.knobRadius, 0x2a2f35, 0.75)
      .setStrokeStyle(2, 0xffffff, 0.14)
      .setScrollFactor(0)
      .setDepth(10001);
    this._joyKnob = knob;

    const joyHit = scene.add
      .rectangle(joy.baseX, joy.baseY, joy.radius * 2.2, joy.radius * 2.2, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(10002)
      .setInteractive();
    this._joyHit = joyHit;
    this._joyG = joyG;

    const setJoy = (p) => {
      const dx = p.x - joy.baseX;
      const dy = p.y - joy.baseY;
      const dist = Math.hypot(dx, dy);
      const max = joy.radius - joy.knobRadius;
      const t = dist > 0 ? Math.min(1, max / dist) : 0;
      const kx = joy.baseX + dx * t;
      const ky = joy.baseY + dy * t;

      joy.knobX = kx;
      joy.knobY = ky;
      knob.setPosition(kx, ky);

      // left/right thresholds (no analog speed in Player yet)
      const thr = 14;
      this._state.left = dx < -thr;
      this._state.right = dx > thr;
    };

    const resetJoy = () => {
      joy.pointerId = null;
      joy.knobX = joy.baseX;
      joy.knobY = joy.baseY;
      knob.setPosition(joy.baseX, joy.baseY);
      this._state.left = false;
      this._state.right = false;
    };

    this._joyDownHandler = (p) => {
      joy.pointerId = p.id;
      setJoy(p);
    };
    joyHit.on('pointerdown', this._joyDownHandler);

    this._joyMoveHandler = (p) => {
      if (joy.pointerId === null) return;
      if (p.id !== joy.pointerId) return;
      setJoy(p);
    };
    scene.input.on('pointermove', this._joyMoveHandler);

    this._joyUpHandler = (p) => {
      if (joy.pointerId === null) return;
      if (p.id !== joy.pointerId) return;
      resetJoy();
    };
    scene.input.on('pointerup', this._joyUpHandler);

    // Buttons
    const padY = h - 78;

    mkBtn({ x: w - 208, y: padY, w: 92, h: 70, label: 'ABAIXA', key: 'crouch' });
    mkBtn({ x: w - 112, y: padY, w: 92, h: 70, label: 'PULA', key: 'jump' });

    mkIconBtn({ x: w - 52, y: h - 160, w: 92, h: 68, texture: 'icon_shotgun', key: 'shootShotgun', fill: 0x1a222a });
    mkIconBtn({ x: w - 52, y: h - 84, w: 92, h: 68, texture: 'icon_smg', key: 'shootSmg', fill: 0x1a222a });

    scene.events.once('shutdown', () => {
      this.destroy();
    });
  }

  update() {
    for (const k of Object.keys(this._state)) {
      this._prev[k] = Boolean(this._prev[k]);
      this._prev[k] = this._prev[k];
    }
  }

  getInput() {
    const mk = (key) => {
      const isDown = Boolean(this._state[key]);
      const prev = Boolean(this._prev[key]);
      this._prev[key] = isDown;
      return { isDown, justDown: isDown && !prev };
    };

    const shotgun = mk('shootShotgun');
    const smg = mk('shootSmg');
    const shootIsDown = shotgun.isDown || smg.isDown;
    const shootPrev = Boolean(this._prev._shoot);
    const shootJustDown = shootIsDown && !shootPrev;
    this._prev._shoot = shootIsDown;

    return {
      left: mk('left'),
      right: mk('right'),
      jump: mk('jump'),
      crouch: mk('crouch'),
      shoot: { isDown: shootIsDown, justDown: shootJustDown },
      weaponShotgun: { isDown: shotgun.isDown, justDown: shotgun.justDown },
      weaponSmg: { isDown: smg.isDown, justDown: smg.justDown },
    };
  }

  destroy() {
    if (this._joyHit && this._joyDownHandler) this._joyHit.off('pointerdown', this._joyDownHandler);
    if (this._joyMoveHandler) this.scene.input.off('pointermove', this._joyMoveHandler);
    if (this._joyUpHandler) this.scene.input.off('pointerup', this._joyUpHandler);
    if (this._joyKnob) this._joyKnob.destroy();
    if (this._joyHit) this._joyHit.destroy();
    if (this._joyG) this._joyG.destroy();

    this._state = {
      left: false,
      right: false,
      jump: false,
      crouch: false,
      shootShotgun: false,
      shootSmg: false,
    };
  }
}
