import { Player } from '../entities/Player.js';
import { HUD } from '../ui/HUD.js';
import { GameState } from '../state/GameState.js';
import { generateSubLevel } from '../levels/generator.js';
import { AudioManager } from '../audio/AudioManager.js';

export class LevelScene extends Phaser.Scene {
  constructor() {
    super('Level');
    this.phaseIndex = 0;
    this.subLevelIndex = 0;
  }

  _maybeTriggerTroll(plat) {
    if (!plat?._troll) return;
    if (plat._troll.armed) return;

    // Only arm once player is actually above it
    const pb = this.player.sprite.body;
    if (!pb) return;
    if (pb.bottom > plat.body.top + 8) return;

    plat._troll.armed = true;
    const { kind, delayMs } = plat._troll;

    this.time.delayedCall(delayMs, () => {
      if (!plat.active) return;
      if (kind === 'vanish') {
        this.tweens.add({
          targets: plat,
          alpha: 0,
          duration: 120,
          onComplete: () => {
            if (!plat.active) return;
            plat.disableBody(true, true);
          },
        });
      } else {
        plat.body.setAllowGravity(true);
        plat.body.setImmovable(false);
      }
    });
  }

  init(data) {
    const state = GameState.load();
    this.phaseIndex = typeof data?.phaseIndex === 'number' ? data.phaseIndex : state.phaseIndex;
    this.subLevelIndex = typeof data?.subLevelIndex === 'number' ? data.subLevelIndex : state.subLevelIndex;
  }

  create() {
    this.level = generateSubLevel(this.phaseIndex, this.subLevelIndex);

    this.physics.world.setBounds(0, 0, this.level.width, this.level.height);
    this.cameras.main.setBounds(0, 0, this.level.width, this.level.height);

    this._createTexturesIfMissing();

    this._buildBackground();

    this._decorations = this.add.container(0, 0);
    this._buildDecorations();

    this.platforms = this.physics.add.staticGroup();
    this.dynamicPlatforms = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    const trollMap = new Map();
    for (const t of this.level.trollPlatforms ?? []) trollMap.set(t.index, t);

    for (let i = 0; i < this.level.platforms.length; i++) {
      const p = this.level.platforms[i];
      const t = trollMap.get(i);

      if (!t) {
        const r = this.add.rectangle(p.x, p.y, p.w, p.h, 0x2a2f35, 1);
        r.setStrokeStyle(1, 0x111418, 1);
        this.physics.add.existing(r, true);
        this.platforms.add(r);
        continue;
      }

       // Falling floor disabled: treat as normal platform
       if (t.kind === 'fall') {
         const r = this.add.rectangle(p.x, p.y, p.w, p.h, 0x2a2f35, 1);
         r.setStrokeStyle(1, 0x111418, 1);
         this.physics.add.existing(r, true);
         this.platforms.add(r);
         continue;
       }

      // Troll platform: dynamic body (can fall or vanish after stepping on it)
      const s = this.physics.add.sprite(p.x, p.y, 'trollPlatform');
      s.setDisplaySize(p.w, p.h);
      s.body.setAllowGravity(false);
      s.body.setImmovable(true);
      s.body.setSize(p.w, p.h, true);
      s.setAlpha(0.95);
      s._troll = { ...t, armed: false };
      this.dynamicPlatforms.add(s);
    }

    this.hazards = this.physics.add.staticGroup();
    for (const hz of this.level.hazards ?? []) {
      if (hz.type === 'spike') {
        const sp = this.add.sprite(hz.x, hz.y, 'spikes');
        sp.setDisplaySize(hz.w, hz.h);
        this.physics.add.existing(sp, true);
        // IMPORTANT: displaySize does not automatically resize Arcade bodies
        sp.body.setSize(hz.w, hz.h, true);
        this.hazards.add(sp);
      } else {
        const r = this.add.rectangle(hz.x, hz.y, hz.w, hz.h, 0xb33a3a, 1);
        r.setStrokeStyle(1, 0x000000, 0.25);
        this.physics.add.existing(r, true);
        this.hazards.add(r);
      }
    }

    this.saws = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const saw of this.level.saws ?? []) {
      const s = this.physics.add.sprite(saw.x, saw.y, 'saw');
      s.body.setCircle(16);
      s.body.setOffset(0, 0);
      s._range = saw.range;
      s._baseX = saw.x;
      s._speed = saw.speed;
      this.saws.add(s);

      this.tweens.add({
        targets: s,
        x: saw.x + saw.range,
        duration: (saw.range / Math.max(1, saw.speed)) * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }

    this.pickups = this.physics.add.staticGroup();
    for (const pk of this.level.pickups ?? []) {
      const s = this.add.sprite(pk.x, pk.y, 'scrap');
      this.physics.add.existing(s, true);
      this.pickups.add(s);
    }

    // Portal at the end of the sublevel
    this.portal = this.physics.add.staticSprite(this.level.portal.x, this.level.portal.y, 'portal');
    this.portal.body.setSize(46, 60, true);

    this.playerBullets = this.physics.add.group({
      defaultKey: 'bullet',
      maxSize: 60,
      bounceX: 0,
      bounceY: 0,
    });

    this.player = new Player(this, this.level.spawn.x, this.level.spawn.y);

    this._playerTouchedGroundOnce = false;
    this.physics.add.collider(this.player.sprite, this.platforms, () => {
      this._playerTouchedGroundOnce = true;
    });
    this.physics.add.collider(this.player.sprite, this.dynamicPlatforms, (_p, plat) => {
      this._playerTouchedGroundOnce = true;
      this._maybeTriggerTroll(plat);
    });
    // Player should only die by touching the toxic river

    // Saws deal damage
    this.physics.add.overlap(this.player.sprite, this.saws, () => {
      AudioManager.sfx('sawHit');
      this.player.damage(1);
      this._shake(90);
    });

    this.physics.add.overlap(this.player.sprite, this.pickups, (_p, item) => {
      item.destroy();
      this._scrapCount = (this._scrapCount ?? 0) + 1;
      this.hud.setHelp(`Peça coletada: ${this._scrapCount} | Sustentabilidade: recicle e reaproveite.`, 2000);
    });

    this.physics.add.overlap(this.player.sprite, this.portal, () => {
      AudioManager.sfx('portal');
      this._goNext();
    });

    this.physics.add.collider(this.playerBullets, this.platforms, (b) => {
      if (!b?.active) return;
      b.setActive(false);
      b.setVisible(false);
      b.body.enable = false;
    });
    this.physics.add.collider(this.playerBullets, this.dynamicPlatforms, (b) => {
      if (!b?.active) return;
      b.setActive(false);
      b.setVisible(false);
      b.body.enable = false;
    });

    this.hud = new HUD(this);
    this.hud.levelText.setText(this.level.name);

    this._keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      jump: Phaser.Input.Keyboard.KeyCodes.UP,
      crouch: Phaser.Input.Keyboard.KeyCodes.DOWN,
      weaponShotgun: Phaser.Input.Keyboard.KeyCodes.X,
      weaponSmg: Phaser.Input.Keyboard.KeyCodes.C,
      shoot: Phaser.Input.Keyboard.KeyCodes.SPACE,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    this.events.on('player_dead', () => {
      // Only possible via saw damage now
      const s = GameState.registerDeath(this.phaseIndex);
      if (s.gameOver) {
        this.hud.showBigAlert('GAME OVER', 1600);
        this.time.delayedCall(900, () => {
          this.scene.start('GameOver');
        });
        return;
      }

      const lives = Math.max(0, 7 - (s.deathCount ?? 0));
      this.hud.setHelp(`Você morreu! Vidas restantes: ${lives}.`, 1800);
      this.scene.restart({ phaseIndex: this.phaseIndex, subLevelIndex: this.subLevelIndex });
    });

    this._setupCamera();

    this.hud.setHelp('←/→ mover | ↑ pular | ↓ agachar | X Reciclagem de Metal | C Reciclagem de Orgânico | Espaço atirar', 4500);

    this._scrapCount = 0;
    this._transitioning = false;

    this._setupToxicRiver();

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  _createTexturesIfMissing() {
    if (!this.textures.exists('player_idle')) {
      const g = this.add.graphics();

      // Rugged survivor look (generic): dark jacket, jeans, beard/hair, backpack
      const skin = 0xe8c2a0;
      const hair = 0x2b241e;
      const jacket = 0x2f3a3a;
      const shirt = 0x556b2f;
      const jeans = 0x1f3a7a;
      const boots = 0x16181b;
      const pack = 0x3a2e22;

      // Backpack
      g.fillStyle(pack, 1);
      g.fillRoundedRect(6, 22, 10, 18, 4);

      // Jacket torso
      g.fillStyle(jacket, 1);
      g.fillRoundedRect(14, 18, 18, 22, 6);

      // Shirt detail
      g.fillStyle(shirt, 0.9);
      g.fillRoundedRect(18, 22, 10, 10, 4);

      // Head
      g.fillStyle(skin, 1);
      g.fillCircle(22, 12, 8);

      // Hair + beard
      g.fillStyle(hair, 1);
      g.fillRoundedRect(14, 3, 16, 8, 4);
      g.fillRoundedRect(16, 14, 12, 6, 3);

      // Legs
      g.fillStyle(jeans, 1);
      g.fillRoundedRect(16, 38, 7, 12, 3);
      g.fillRoundedRect(25, 38, 7, 12, 3);

      // Boots
      g.fillStyle(boots, 1);
      g.fillRoundedRect(15, 48, 9, 4, 2);
      g.fillRoundedRect(24, 48, 9, 4, 2);

      // Arms
      g.fillStyle(jacket, 1);
      g.fillRoundedRect(10, 22, 6, 14, 3);
      g.fillRoundedRect(32, 22, 6, 14, 3);

      g.generateTexture('player_idle', 40, 52);
      g.destroy();
    }

    if (!this.textures.exists('player_run1')) {
      const g = this.add.graphics();
      const skin = 0xe8c2a0;
      const hair = 0x2b241e;
      const jacket = 0x2f3a3a;
      const shirt = 0x556b2f;
      const jeans = 0x1f3a7a;
      const boots = 0x16181b;
      const pack = 0x3a2e22;

      g.fillStyle(pack, 1);
      g.fillRoundedRect(6, 22, 10, 18, 4);

      g.fillStyle(jacket, 1);
      g.fillRoundedRect(14, 18, 18, 22, 6);
      g.fillStyle(shirt, 0.9);
      g.fillRoundedRect(18, 22, 10, 10, 4);

      g.fillStyle(skin, 1);
      g.fillCircle(22, 12, 8);
      g.fillStyle(hair, 1);
      g.fillRoundedRect(14, 3, 16, 8, 4);
      g.fillRoundedRect(16, 14, 12, 6, 3);

      // Run pose legs
      g.fillStyle(jeans, 1);
      g.fillRoundedRect(15, 38, 9, 12, 3);
      g.fillRoundedRect(25, 40, 9, 10, 3);
      g.fillStyle(boots, 1);
      g.fillRoundedRect(14, 48, 10, 4, 2);
      g.fillRoundedRect(24, 48, 10, 4, 2);

      // Arms
      g.fillStyle(jacket, 1);
      g.fillRoundedRect(10, 22, 6, 14, 3);
      g.fillRoundedRect(32, 22, 6, 14, 3);

      g.generateTexture('player_run1', 40, 52);
      g.destroy();
    }

    if (!this.textures.exists('player_run2')) {
      const g = this.add.graphics();
      const skin = 0xe8c2a0;
      const hair = 0x2b241e;
      const jacket = 0x2f3a3a;
      const shirt = 0x556b2f;
      const jeans = 0x1f3a7a;
      const boots = 0x16181b;
      const pack = 0x3a2e22;

      g.fillStyle(pack, 1);
      g.fillRoundedRect(6, 22, 10, 18, 4);

      g.fillStyle(jacket, 1);
      g.fillRoundedRect(14, 18, 18, 22, 6);
      g.fillStyle(shirt, 0.9);
      g.fillRoundedRect(18, 22, 10, 10, 4);

      g.fillStyle(skin, 1);
      g.fillCircle(22, 12, 8);
      g.fillStyle(hair, 1);
      g.fillRoundedRect(14, 3, 16, 8, 4);
      g.fillRoundedRect(16, 14, 12, 6, 3);

      // Alternate run pose legs
      g.fillStyle(jeans, 1);
      g.fillRoundedRect(16, 40, 9, 10, 3);
      g.fillRoundedRect(25, 38, 9, 12, 3);
      g.fillStyle(boots, 1);
      g.fillRoundedRect(15, 48, 10, 4, 2);
      g.fillRoundedRect(24, 48, 10, 4, 2);

      // Arms
      g.fillStyle(jacket, 1);
      g.fillRoundedRect(10, 22, 6, 14, 3);
      g.fillRoundedRect(32, 22, 6, 14, 3);

      g.generateTexture('player_run2', 40, 52);
      g.destroy();
    }

    if (!this.textures.exists('player_crouch')) {
      const g = this.add.graphics();
      const skin = 0xe8c2a0;
      const hair = 0x2b241e;
      const jacket = 0x2f3a3a;
      const jeans = 0x1f3a7a;
      const boots = 0x16181b;
      const pack = 0x3a2e22;

      g.fillStyle(pack, 1);
      g.fillRoundedRect(6, 28, 10, 14, 4);

      g.fillStyle(jacket, 1);
      g.fillRoundedRect(14, 26, 18, 14, 6);

      g.fillStyle(skin, 1);
      g.fillCircle(20, 18, 7);
      g.fillStyle(hair, 1);
      g.fillRoundedRect(12, 11, 16, 7, 4);
      g.fillRoundedRect(14, 20, 12, 5, 3);

      g.fillStyle(jeans, 1);
      g.fillRoundedRect(14, 38, 18, 10, 4);
      g.fillStyle(boots, 1);
      g.fillRoundedRect(14, 46, 10, 4, 2);
      g.fillRoundedRect(22, 46, 10, 4, 2);

      g.generateTexture('player_crouch', 40, 52);
      g.destroy();
    }

    if (!this.textures.exists('player_jump')) {
      const g = this.add.graphics();
      const skin = 0xe8c2a0;
      const hair = 0x2b241e;
      const jacket = 0x2f3a3a;
      const shirt = 0x556b2f;
      const jeans = 0x1f3a7a;
      const boots = 0x16181b;
      const pack = 0x3a2e22;

      g.fillStyle(pack, 1);
      g.fillRoundedRect(6, 22, 10, 18, 4);
      g.fillStyle(jacket, 1);
      g.fillRoundedRect(14, 18, 18, 22, 6);
      g.fillStyle(shirt, 0.9);
      g.fillRoundedRect(18, 22, 10, 10, 4);
      g.fillStyle(skin, 1);
      g.fillCircle(22, 12, 8);
      g.fillStyle(hair, 1);
      g.fillRoundedRect(14, 3, 16, 8, 4);
      g.fillRoundedRect(16, 14, 12, 6, 3);

      g.fillStyle(jeans, 1);
      g.fillRoundedRect(16, 38, 16, 10, 4);
      g.fillStyle(boots, 1);
      g.fillRoundedRect(16, 46, 10, 4, 2);
      g.fillRoundedRect(22, 46, 10, 4, 2);

      g.generateTexture('player_jump', 40, 52);
      g.destroy();
    }

    if (!this.textures.exists('player_shoot')) {
      const g = this.add.graphics();
      const skin = 0xe8c2a0;
      const hair = 0x2b241e;
      const jacket = 0x2f3a3a;
      const jeans = 0x1f3a7a;
      const boots = 0x16181b;
      const pack = 0x3a2e22;

      g.fillStyle(pack, 1);
      g.fillRoundedRect(6, 22, 10, 18, 4);
      g.fillStyle(jacket, 1);
      g.fillRoundedRect(14, 18, 18, 22, 6);
      g.fillStyle(skin, 1);
      g.fillCircle(22, 12, 8);
      g.fillStyle(hair, 1);
      g.fillRoundedRect(14, 3, 16, 8, 4);
      g.fillRoundedRect(16, 14, 12, 6, 3);

      g.fillStyle(jeans, 1);
      g.fillRoundedRect(16, 38, 7, 12, 3);
      g.fillRoundedRect(25, 38, 7, 12, 3);
      g.fillStyle(boots, 1);
      g.fillRoundedRect(15, 48, 9, 4, 2);
      g.fillRoundedRect(24, 48, 9, 4, 2);

      // Tool + extended arm
      g.fillStyle(jacket, 1);
      g.fillRoundedRect(30, 22, 8, 10, 3);
      // Recycling tool (nozzle + recycle mark)
      g.fillStyle(0x2a7bd8, 1);
      g.fillRoundedRect(34, 23, 14, 6, 3);
      g.fillStyle(0x7bd389, 1);
      g.fillTriangle(40, 24, 46, 26, 40, 28);
      g.lineStyle(1, 0xeaeaea, 0.35);
      g.strokeRoundedRect(34.5, 23.5, 13, 5, 3);

      g.generateTexture('player_shoot', 52, 52);
      g.destroy();
    }

    if (!this.textures.exists('player_crouch_shoot')) {
      const g = this.add.graphics();
      const skin = 0xe8c2a0;
      const hair = 0x2b241e;
      const jacket = 0x2f3a3a;
      const jeans = 0x1f3a7a;
      const boots = 0x16181b;
      const pack = 0x3a2e22;

      g.fillStyle(pack, 1);
      g.fillRoundedRect(6, 28, 10, 14, 4);
      g.fillStyle(jacket, 1);
      g.fillRoundedRect(14, 26, 18, 14, 6);
      g.fillStyle(skin, 1);
      g.fillCircle(20, 18, 7);
      g.fillStyle(hair, 1);
      g.fillRoundedRect(12, 11, 16, 7, 4);
      g.fillRoundedRect(14, 20, 12, 5, 3);

      g.fillStyle(jeans, 1);
      g.fillRoundedRect(14, 38, 18, 10, 4);
      g.fillStyle(boots, 1);
      g.fillRoundedRect(14, 46, 10, 4, 2);
      g.fillRoundedRect(22, 46, 10, 4, 2);

      g.fillStyle(jacket, 1);
      g.fillRoundedRect(28, 26, 8, 10, 3);
      // Recycling tool (compact head)
      g.fillStyle(0x2a7bd8, 1);
      g.fillRoundedRect(32, 27, 16, 6, 3);
      g.fillStyle(0x7bd389, 1);
      g.fillRect(34, 29, 10, 2);
      g.lineStyle(1, 0xeaeaea, 0.35);
      g.strokeRoundedRect(32.5, 27.5, 15, 5, 3);
      g.generateTexture('player_crouch_shoot', 52, 52);
      g.destroy();
    }

    if (!this.textures.exists('bullet')) {
      const g = this.add.graphics();
      g.fillStyle(0xeaeaea, 1);
      g.fillRoundedRect(0, 0, 10, 4, 2);
      g.generateTexture('bullet', 10, 4);
      g.destroy();
    }

    if (!this.textures.exists('recyclePellet')) {
      const g = this.add.graphics();
      g.fillStyle(0x7bd389, 1);
      g.fillRoundedRect(0, 0, 10, 6, 3);
      g.fillStyle(0x111418, 0.35);
      g.fillTriangle(3, 1, 9, 3, 3, 5);
      g.lineStyle(1, 0xeaeaea, 0.35);
      g.strokeRoundedRect(0.5, 0.5, 9, 5, 3);
      g.generateTexture('recyclePellet', 10, 6);
      g.destroy();
    }

    if (!this.textures.exists('recycleBolt')) {
      const g = this.add.graphics();
      g.fillStyle(0x2a7bd8, 1);
      g.fillRoundedRect(0, 0, 12, 6, 3);
      g.fillStyle(0x7bd389, 1);
      g.fillRect(2, 2, 8, 2);
      g.lineStyle(1, 0xeaeaea, 0.30);
      g.strokeRoundedRect(0.5, 0.5, 11, 5, 3);
      g.generateTexture('recycleBolt', 12, 6);
      g.destroy();
    }
    if (!this.textures.exists('trashBagPellet')) {
      const g = this.add.graphics();
      // Small black trash bag (shotgun-like pellets)
      g.lineStyle(2, 0xFFFF00, 0.95);
      g.strokeRoundedRect(1, 3, 12, 10, 5);
      g.fillStyle(0xFFD700, 1);
      g.fillRoundedRect(1, 3, 12, 10, 5);
      g.fillStyle(0xCCCC00, 1);
      g.fillRoundedRect(3, 6, 8, 5, 4);
      g.fillStyle(0x16a34a, 1);
      g.fillTriangle(5, 2, 9, 2, 7, 5);
      g.fillStyle(0x05230f, 1);
      g.fillRoundedRect(6, 1, 2, 3, 1);
      g.fillStyle(0xffffff, 0.14);
      g.fillRect(4, 6, 2, 1);
      g.fillRect(9, 7, 2, 1);
      g.generateTexture('trashBagPellet', 14, 14);
      g.destroy();
    }

    if (!this.textures.exists('trashBagBolt')) {
      const g = this.add.graphics();
      // Slightly larger bag (SMG-like)
      g.lineStyle(2, 0x00FF00, 0.95);
      g.strokeRoundedRect(1, 3, 14, 10, 5);
      g.fillStyle(0x32CD32, 1);
      g.fillRoundedRect(1, 3, 14, 10, 5);
      g.fillStyle(0x008000, 1);
      g.fillRoundedRect(4, 6, 8, 5, 4);
      g.fillStyle(0x16a34a, 1);
      g.fillTriangle(6, 2, 10, 2, 8, 5);
      g.fillStyle(0x05230f, 1);
      g.fillRoundedRect(7, 1, 2, 3, 1);
      g.fillStyle(0xffffff, 0.14);
      g.fillRect(5, 6, 3, 1);
      g.fillRect(11, 7, 2, 1);
      g.generateTexture('trashBagBolt', 16, 14);
      g.destroy();
    }

    if (!this.textures.exists('portal')) {
      const g = this.add.graphics();
      g.fillStyle(0x7bd389, 1);
      g.fillRoundedRect(0, 0, 46, 60, 12);
      g.fillStyle(0x0b0e10, 0.22);
      g.fillRoundedRect(10, 10, 26, 40, 10);
      g.lineStyle(2, 0xeaeaea, 0.5);
      g.strokeRoundedRect(4, 4, 38, 52, 12);
      g.generateTexture('portal', 46, 60);
      g.destroy();
    }

    if (!this.textures.exists('spikes')) {
      const g = this.add.graphics();
      g.fillStyle(0xff6b6b, 1);
      for (let i = 0; i < 12; i++) {
        const x = i * 10;
        g.fillTriangle(x, 18, x + 5, 2, x + 10, 18);
      }
      g.generateTexture('spikes', 120, 20);
      g.destroy();
    }

    if (!this.textures.exists('saw')) {
      const g = this.add.graphics();
      g.fillStyle(0xcad3f5, 1);
      g.fillCircle(16, 16, 16);
      g.fillStyle(0x0b0e10, 0.35);
      g.fillCircle(16, 16, 6);
      g.lineStyle(2, 0x0b0e10, 0.35);
      for (let i = 0; i < 10; i++) {
        g.beginPath();
        g.moveTo(16, 16);
        const a = (i / 10) * Math.PI * 2;
        g.lineTo(16 + Math.cos(a) * 16, 16 + Math.sin(a) * 16);
        g.strokePath();
      }
      g.generateTexture('saw', 32, 32);
      g.destroy();
    }

    if (!this.textures.exists('trollPlatform')) {
      const g = this.add.graphics();
      g.fillStyle(0x6b6bff, 1);
      g.fillRoundedRect(0, 0, 120, 26, 6);
      g.fillStyle(0x0b0e10, 0.18);
      g.fillRect(10, 6, 100, 4);
      g.generateTexture('trollPlatform', 120, 26);
      g.destroy();
    }

    if (!this.textures.exists('scrap')) {
      const g = this.add.graphics();
      g.fillStyle(0x6bbcff, 1);
      g.fillRoundedRect(0, 0, 14, 14, 3);
      g.lineStyle(2, 0x0b0e10, 0.35);
      g.strokeRoundedRect(0, 0, 14, 14, 3);
      g.generateTexture('scrap', 14, 14);
      g.destroy();
    }

    if (!this.textures.exists('toxic')) {
      const g = this.add.graphics();
      g.fillStyle(0x47e37a, 1);
      g.fillRect(0, 0, 64, 20);
      g.fillStyle(0x0b0e10, 0.18);
      for (let i = 0; i < 12; i++) {
        g.fillCircle(6 + i * 5, 6 + ((i % 3) * 3), 4);
      }
      g.generateTexture('toxic', 64, 20);
      g.destroy();
    }
  }

  _buildBackground() {
    this.add.rectangle(
      this.level.width / 2,
      this.level.height / 2,
      this.level.width,
      this.level.height,
      0x0b0e10,
    );

    const bgKey = this.level.key === 'TUTORIAL' ? 'bg_factory_2' : 'bg_factory_1';
    if (this.textures.exists(bgKey)) {
      const img = this.add.image(this.level.width / 2, this.level.height / 2, bgKey);
      const scaleX = this.level.width / img.width;
      const scaleY = this.level.height / img.height;
      img.setScale(Math.max(scaleX, scaleY));
      img.setScrollFactor(0.35, 0.35);
      img.setAlpha(0.55);
      img.setDepth(0);
    }
    const haze = this.add.particles(0, 0, 'pixel', {
      x: { min: 0, max: this.level.width },
      y: { min: 0, max: this.level.height },
      lifespan: { min: 5000, max: 9000 },
      speedX: { min: -10, max: 10 },
      speedY: { min: -5, max: -25 },
      scale: { start: 1.4, end: 0.1 },
      alpha: { start: 0.06, end: 0 },
      quantity: 2,
      frequency: 45,
      tint: [0x1f2a1f, 0x1a222a],
      blendMode: 'ADD',
    });
    haze.setDepth(0);
  }

  _buildDecorations() {
    // Simple industrial props to give life to the scene (procedural)
    const count = Math.floor(this.level.width / 260);
    for (let i = 0; i < count; i++) {
      const x = 120 + i * 260 + (Math.random() * 80 - 40);
      const lamp = this.add.rectangle(x, 70, 38, 10, 0x1a1f24, 1);
      const glow = this.add.rectangle(x, 82, 120, 46, 0xf6c177, 0.07);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      const pipe = this.add.rectangle(x + 90, 150, 18, 140, 0x20262c, 1);
      pipe.setAlpha(0.9);
      this._decorations.add([lamp, glow, pipe]);
    }
    this._decorations.setDepth(0.5);
  }

  _setupToxicRiver() {
    // Only for parkour levels (not tutorial)
    this._toxicEnabled = !(this.phaseIndex === 0 && this.subLevelIndex === 0);
    if (!this._toxicEnabled) return;

    const w = this.level.width;
    const h = this.level.height;

    this._toxic = this.physics.add.sprite(w / 2, h + 140, 'toxic');
    this._toxic.setImmovable(true);
    this._toxic.body.setAllowGravity(false);
    this._toxic.body.setSize(w, 80, true);
    this._toxic.setDisplaySize(w, 80);
    this._toxic.setAlpha(0.85);
    this._toxic.setDepth(0.8);

    this._toxicStartY = h + 140;
    // Stop rising once it reaches a portion of the floor (do not keep climbing forever)
    this._toxicStopY = h - 40;
    this._toxicSpeed = 18 * 0.85; // px/s, ramps up later (15% slower)
    this._toxicStartedAt = null;
  }

  _restartFromToxic() {
    if (this._transitioning) return;
    this._transitioning = true;
    AudioManager.sfx('lava');
    this.hud.setHelp('Você tocou no rio tóxico! Voltando ao início…', 2600);
    this.cameras.main.flash(140, 70, 255, 140);
    this.time.delayedCall(250, () => {
      const s = GameState.registerDeath(this.phaseIndex);
      if (s.gameOver) {
        this.hud.showBigAlert('GAME OVER', 1600);
        this.time.delayedCall(900, () => {
          this.scene.start('GameOver');
        });
        return;
      }

      const lives = Math.max(0, 7 - (s.deathCount ?? 0));
      this.hud.setHelp(`Rio tóxico! Vidas restantes: ${lives}.`, 1800);
      this.scene.restart({ phaseIndex: this.phaseIndex, subLevelIndex: this.subLevelIndex });
    });
  }

  _setupCamera() {
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(180, 120);
  }

  _shake(ms) {
    this.cameras.main.shake(ms, 0.005);
  }

  _onDead() {
    // Death by falling/hazards disabled; keep method for compatibility.
    return;
  }

  _goNext() {
    if (this._transitioning) return;
    this._transitioning = true;

    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.time.delayedCall(380, () => {
      const nextSub = this.subLevelIndex + 1;
      if (nextSub >= 5) {
        GameState.setProgress({ phaseIndex: this.phaseIndex, subLevelIndex: 0 });
        this.scene.start('Boss', { phaseIndex: this.phaseIndex });
      } else {
        GameState.setProgress({ phaseIndex: this.phaseIndex, subLevelIndex: nextSub });
        this.scene.start('Level', { phaseIndex: this.phaseIndex, subLevelIndex: nextSub });
      }
    });
  }

  update() {
    const now = this.time.now;
    const dt = this.game.loop.delta;

    const input = {
      left: { isDown: this._keys.left.isDown, justDown: Phaser.Input.Keyboard.JustDown(this._keys.left) },
      right: { isDown: this._keys.right.isDown, justDown: Phaser.Input.Keyboard.JustDown(this._keys.right) },
      jump: { isDown: this._keys.jump.isDown, justDown: Phaser.Input.Keyboard.JustDown(this._keys.jump) },
      crouch: { isDown: this._keys.crouch.isDown, justDown: Phaser.Input.Keyboard.JustDown(this._keys.crouch) },
      shoot: { isDown: this._keys.shoot.isDown, justDown: Phaser.Input.Keyboard.JustDown(this._keys.shoot) },
      weaponShotgun: {
        isDown: this._keys.weaponShotgun.isDown,
        justDown: Phaser.Input.Keyboard.JustDown(this._keys.weaponShotgun),
      },
      weaponSmg: { isDown: this._keys.weaponSmg.isDown, justDown: Phaser.Input.Keyboard.JustDown(this._keys.weaponSmg) },
    };

    this.player.update(input);

    if (this._toxicEnabled && this._toxic) {
      if (this._toxicStartedAt === null) {
        // Start rising only after player touched ground at least once
        if (this._playerTouchedGroundOnce) {
          this._toxicStartedAt = now;
        }
      } else {
        const elapsed = (now - this._toxicStartedAt) / 1000;
        const speed = this._toxicSpeed + (elapsed > 10 ? 10 : 0) + (elapsed > 18 ? 14 : 0);
        const nextY = Math.max(this._toxicStopY, this._toxic.y - speed * (dt / 1000));
        this._toxic.y = nextY;
        // Keep physics body synced to the game object without teleport side-effects
        this._toxic.body.updateFromGameObject();
      }

      // Bounds-based contact check: die only when the player's feet visually touch the toxic surface
      const pb = this.player?.sprite?.body;
      if (pb) {
        const toxicBounds = this._toxic.getBounds();
        const playerBounds = this.player.sprite.getBounds();
        const surfaceY = toxicBounds.top;
        const feetY = pb.bottom;
        const xOverlap = playerBounds.right > toxicBounds.left + 2 && playerBounds.left < toxicBounds.right - 2;
        const yOverlap = playerBounds.bottom > toxicBounds.top && playerBounds.top < toxicBounds.bottom;

        // Extra tolerance to avoid early triggers while falling near the surface
        if (xOverlap && yOverlap && feetY >= surfaceY + 6) {
          this._restartFromToxic();
        }
      }
    }

    // Spin saw visuals
    if (this.saws) {
      this.saws.children.each((s) => {
        if (!s?.active) return;
        s.rotation += 0.22;
      });
    }

    this.playerBullets.children.each((b) => {
      if (!b.active) return;
      if (b.lifespan && now > b.lifespan) {
        b.setActive(false);
        b.setVisible(false);
        b.body.enable = false;
      }
    });

    if (Phaser.Input.Keyboard.JustDown(this._keys.restart)) {
      this.scene.restart({ phaseIndex: this.phaseIndex, subLevelIndex: this.subLevelIndex });
    }

    const state = GameState.load();
    const lives = Math.max(0, 7 - (state.deathCount ?? 0));

    this.hud.update({
      hp: this.player.hp,
      hpMax: this.player.hpMax,
      weapon: this.player.weapon,
      levelName: this.level.name,
      lives,
      livesMax: 7,
    });
  }
}
