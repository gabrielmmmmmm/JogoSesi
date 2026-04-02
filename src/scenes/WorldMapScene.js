import { GameState } from '../state/GameState.js';
import { ODS, odsLabel } from '../ods/ods.js';

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('WorldMap');
  }

  create() {
    const { width: w, height: h } = this.scale;

    // Mario 3-like overworld composition (tile-ish), but themed as factory
    this.add.rectangle(w / 2, h / 2, w, h, 0x0b0e10, 1);

    const tile = this.add.graphics();
    const tileSize = 24;
    for (let yy = 0; yy < h; yy += tileSize) {
      for (let xx = 0; xx < w; xx += tileSize) {
        const isEven = ((xx / tileSize + yy / tileSize) | 0) % 2 === 0;
        const c = isEven ? 0x2a2f35 : 0x23282e;
        tile.fillStyle(c, 1);
        tile.fillRect(xx, yy, tileSize, tileSize);
        tile.fillStyle(0x000000, 0.12);
        tile.fillRect(xx, yy + tileSize - 2, tileSize, 2);
        tile.fillStyle(0xffffff, 0.05);
        tile.fillRect(xx, yy, tileSize, 1);
      }
    }

    const stripes = this.add.graphics();
    stripes.fillStyle(0x000000, 0.12);
    stripes.fillRect(0, 0, w, 74);
    stripes.fillRect(0, h - 74, w, 74);
    for (let x = -40; x < w + 80; x += 22) {
      stripes.fillStyle(0xf6c177, 0.22);
      stripes.fillTriangle(x, 0, x + 12, 0, x + 36, 74);
      stripes.fillStyle(0x000000, 0.18);
      stripes.fillTriangle(x + 10, 0, x + 22, 0, x + 46, 74);

      stripes.fillStyle(0xf6c177, 0.22);
      stripes.fillTriangle(x, h, x + 12, h, x + 36, h - 74);
      stripes.fillStyle(0x000000, 0.18);
      stripes.fillTriangle(x + 10, h, x + 22, h, x + 46, h - 74);
    }

    // Top and bottom "factory greenery" bands (replace bushes rows with vents/trees-like shapes)
    const deco = this.add.graphics();
    const drawVent = (x, y, s = 1) => {
      deco.fillStyle(0x2a2f35, 1);
      deco.fillRoundedRect(x, y, 30 * s, 22 * s, 6 * s);
      deco.fillStyle(0x111418, 1);
      for (let i = 0; i < 3; i++) {
        deco.fillRoundedRect(x + 6 * s, y + (5 + i * 6) * s, 18 * s, 3 * s, 2 * s);
      }
      deco.fillStyle(0xf6c177, 0.18);
      deco.fillRoundedRect(x + 4 * s, y + 4 * s, 22 * s, 4 * s, 2 * s);
    };

    for (let i = 0; i < 12; i++) {
      drawVent(24 + i * 74, 18 + (i % 2) * 6, 1);
      drawVent(34 + i * 74, h - 46 - (i % 2) * 6, 1);
    }

    // Central "scrap piles" (replace brown hills)
    const piles = this.add.graphics();
    const scrap = (x, y, s = 1) => {
      piles.fillStyle(0x7a5a2c, 1);
      piles.fillCircle(x, y, 14 * s);
      piles.fillCircle(x + 16 * s, y + 6 * s, 12 * s);
      piles.fillCircle(x - 16 * s, y + 8 * s, 11 * s);
      piles.fillStyle(0x2a2f35, 0.75);
      piles.fillRoundedRect(x - 10 * s, y + 2 * s, 18 * s, 8 * s, 3 * s);
      piles.fillStyle(0x111418, 0.35);
      piles.fillCircle(x - 8 * s, y + 8 * s, 12 * s);
    };
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        scrap(170 + c * 34, 300 + r * 28, 0.95);
      }
    }

    // Water moat around the destination area (like Mario 3 castle lake)
    const water = this.add.graphics();
    water.fillStyle(0x2a7bd8, 1);
    water.fillRoundedRect(w - 300, 116, 244, 190, 18);
    water.fillStyle(0x5fc6ff, 0.22);
    water.fillRoundedRect(w - 290, 126, 224, 170, 16);
    // Inner island (factory floor)
    water.fillStyle(0x2a2f35, 1);
    water.fillRoundedRect(w - 274, 142, 192, 138, 14);
    water.fillStyle(0x000000, 0.16);
    water.fillRoundedRect(w - 266, 150, 176, 18, 8);
    water.fillStyle(0xf6c177, 0.35);
    for (let i = 0; i < 6; i++) {
      const bx = w - 264 + i * 30;
      water.fillTriangle(bx, 150, bx + 14, 150, bx + 28, 168);
    }

    const state = GameState.load();

    this.add.text(24, 14, 'MAPA DA FÁBRICA', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      fontSize: '22px',
      fontStyle: '900',
      color: 'rgba(234,234,234,0.92)',
    });

    this.add.text(24, 40, '←/→ mover | ENTER jogar | R reset | ESC menu', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      fontSize: '13px',
      color: 'rgba(234,234,234,0.65)',
    });

    // Phase node path (sequential, like overworld)
    const path = [
      { x: 132, y: 200 },
      { x: 214, y: 200 },
      { x: 298, y: 200 },
      { x: 298, y: 270 },
      { x: 380, y: 270 },
      { x: 460, y: 270 },
      { x: 540, y: 270 },
      { x: 624, y: 240 },
      { x: 710, y: 210 },
      { x: 820, y: 210 },
    ];

    // Mario 3-like light path
    const roads = this.add.graphics();
    roads.lineStyle(16, 0x000000, 0.35);
    roads.strokePoints(path, false);
    roads.lineStyle(10, 0xbfc6cf, 0.9);
    roads.strokePoints(path, false);
    roads.lineStyle(6, 0x2a2f35, 1);
    roads.strokePoints(path, false);

    // Path highlight blocks (like the print)
    const blocks = this.add.graphics();
    blocks.fillStyle(0xffffff, 0.22);
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      blocks.fillRoundedRect(a.x - 8, a.y - 8, 16, 16, 3);
    }

    // Start sign
    const start = this.add.container(0, 0);
    const startPost = this.add.rectangle(path[0].x - 64, path[0].y + 14, 10, 46, 0x2a2f35, 1);
    const startBoard = this.add
      .rectangle(path[0].x - 40, path[0].y - 2, 74, 34, 0x111418, 1)
      .setStrokeStyle(2, 0xf6c177, 0.9);
    const startTxt = this.add
      .text(path[0].x - 40, path[0].y - 2, 'START', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '16px',
        fontStyle: '900',
        color: '#eaeaea',
      })
      .setOrigin(0.5);
    start.add([startPost, startBoard, startTxt]);

    // Factory building (end)
    const castle = this.add.container(0, 0);
    const cx = w - 178;
    const cy = 206;
    castle.add(this.add.rectangle(cx, cy + 50, 116, 86, 0x2a2f35, 1).setStrokeStyle(2, 0x111418, 1));
    castle.add(this.add.rectangle(cx, cy + 16, 92, 92, 0x3a3f46, 1).setStrokeStyle(2, 0x111418, 1));
    castle.add(this.add.rectangle(cx - 40, cy + 6, 28, 72, 0x3a3f46, 1).setStrokeStyle(2, 0x111418, 1));
    castle.add(this.add.rectangle(cx + 40, cy + 6, 28, 72, 0x3a3f46, 1).setStrokeStyle(2, 0x111418, 1));
    // Chimneys
    castle.add(this.add.rectangle(cx - 20, cy - 56, 18, 52, 0x2a2f35, 1).setStrokeStyle(2, 0x111418, 1));
    castle.add(this.add.rectangle(cx + 16, cy - 62, 18, 60, 0x2a2f35, 1).setStrokeStyle(2, 0x111418, 1));
    const smoke = this.add.particles(0, 0, 'pixel', {
      x: { min: cx - 28, max: cx + 18 },
      y: { min: cy - 98, max: cy - 88 },
      lifespan: { min: 1400, max: 2600 },
      speedY: { min: -18, max: -42 },
      speedX: { min: -8, max: 8 },
      scale: { start: 2.2, end: 0.1 },
      alpha: { start: 0.14, end: 0 },
      frequency: 80,
      quantity: 1,
      tint: [0xffffff, 0xbababa],
      blendMode: 'ADD',
    });
    smoke.setDepth(0.1);

    castle.add(this.add.rectangle(cx, cy + 40, 34, 48, 0x111418, 1).setStrokeStyle(2, 0x000000, 0.35));
    castle.add(this.add.rectangle(cx, cy + 30, 14, 14, 0xff5a4f, 1));
    castle.add(this.add.rectangle(cx, cy + 50, 14, 14, 0x2fb65e, 1));

    this.nodes = [];
    for (let i = 0; i < 10; i++) {
      const pos = path[i];
      const unlocked = i <= state.unlockedPhaseIndex;
      const done = state.odsUnlocked[i];

      const node = this.add.container(0, 0);
      const shadow = this.add.rectangle(pos.x + 6, pos.y + 8, 34, 34, 0x000000, 0.18);
      const base = this.add.rectangle(pos.x, pos.y, 34, 34, 0x0b0e10, 1);
      base.setStrokeStyle(3, unlocked ? (done ? 0x7bd389 : 0x2a7bd8) : 0x1a1f24, 1);
      const inner = this.add.rectangle(pos.x, pos.y, 26, 26, unlocked ? 0x0f1418 : 0x0a0c0f, 1);
      inner.setAlpha(0.95);
      const label = this.add
        .text(pos.x, pos.y, `${i + 1}`, {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
          fontSize: '16px',
          fontStyle: '900',
          color: unlocked ? '#eaeaea' : 'rgba(234,234,234,0.25)',
        })
        .setOrigin(0.5);

      node.add([shadow, base, inner, label]);

      node.setSize(42, 42);
      node.setInteractive(
        new Phaser.Geom.Rectangle(pos.x - 21, pos.y - 21, 42, 42),
        Phaser.Geom.Rectangle.Contains,
      );

      node.on('pointerdown', () => {
        const s = GameState.load();
        if (i > s.unlockedPhaseIndex) return;
        this.selected = i;
        this._moveCursor();
        this._refreshDetails();
        GameState.setProgress({ phaseIndex: this.selected, subLevelIndex: 0 });
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.time.delayedCall(210, () => {
          this.scene.start('Level', { phaseIndex: this.selected, subLevelIndex: 0 });
        });
      });

      this.nodes.push({ i, x: pos.x, y: pos.y, unlocked, done, base, label, node });
    }

    // Cursor
    this.cursor = this.add
      .rectangle(0, 0, 42, 42)
      .setStrokeStyle(3, 0xff5a4f, 1)
      .setFillStyle(0xffffff, 0.10);

    this.selected = Math.min(state.phaseIndex, state.unlockedPhaseIndex);
    this._moveCursor();

    this.details = this.add
      .text(24, h - 14, '', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: '14px',
        color: 'rgba(234,234,234,0.78)',
      })
      .setOrigin(0, 1);

    this._refreshDetails();

    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    });
  }

  _refreshDetails() {
    const state = GameState.load();
    const unlocked = this.selected <= state.unlockedPhaseIndex;
    const done = state.odsUnlocked[this.selected];
    const txt =
      `Fase ${this.selected + 1} | ` +
      `${done ? 'ODS conquistada' : 'ODS pendente'} | ` +
      `${unlocked ? 'Liberada' : 'Bloqueada'}\n` +
      `${odsLabel(this.selected)}`;
    this.details.setText(txt);
  }

  _moveCursor() {
    const node = this.nodes.find((n) => n.i === this.selected);
    if (!node) return;
    this.cursor.setPosition(node.x, node.y);
  }

  update() {
    const state = GameState.load();

    const canSelect = (idx) => idx >= 0 && idx <= 9;

    if (Phaser.Input.Keyboard.JustDown(this.keys.left) && canSelect(this.selected - 1)) {
      this.selected -= 1;
      this._moveCursor();
      this._refreshDetails();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.right) && canSelect(this.selected + 1)) {
      this.selected += 1;
      this._moveCursor();
      this._refreshDetails();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      GameState.reset();
      this.scene.restart();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
      if (this.selected > state.unlockedPhaseIndex) return;
      GameState.setProgress({ phaseIndex: this.selected, subLevelIndex: 0 });
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.time.delayedCall(260, () => {
        this.scene.start('Level', { phaseIndex: this.selected, subLevelIndex: 0 });
      });
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      this.scene.start('Intro');
    }
  }
}
