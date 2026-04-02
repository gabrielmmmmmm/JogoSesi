import { Player } from '../entities/Player.js';
import { HUD } from '../ui/HUD.js';
import { GameState } from '../state/GameState.js';
import { AudioManager } from '../audio/AudioManager.js';

export class BossScene extends Phaser.Scene {
  constructor() {
    super('Boss');
    this.phaseIndex = 0;
  }

  init(data) {
    const state = GameState.load();
    this.phaseIndex = typeof data?.phaseIndex === 'number' ? data.phaseIndex : state.phaseIndex;
  }

  create() {
    this._createTexturesIfMissing();

    AudioManager.startBossMusic();
    this.events.once('shutdown', () => {
      AudioManager.stopBossMusic();
    });

    const w = 1800;
    const h = 540;

    this.physics.world.setBounds(0, 0, w, h);
    this.cameras.main.setBounds(0, 0, w, h);

    this.add.rectangle(w / 2, h / 2, w, h, 0x080a0c);

    const haze = this.add.particles(0, 0, 'pixel', {
      x: { min: 0, max: w },
      y: { min: 0, max: h },
      lifespan: { min: 5000, max: 9000 },
      speedX: { min: -10, max: 10 },
      speedY: { min: -5, max: -25 },
      scale: { start: 1.4, end: 0.1 },
      alpha: { start: 0.06, end: 0 },
      quantity: 2,
      frequency: 42,
      tint: [0x2a1f1f, 0x1a222a],
      blendMode: 'ADD',
    });
    haze.setDepth(0);

    this.platforms = this.physics.add.staticGroup();

    const floor = this.add.rectangle(w / 2, 510, w, 60, 0x2a2f35, 1);
    floor.setStrokeStyle(1, 0x111418, 1);
    this.physics.add.existing(floor, true);
    this.platforms.add(floor);

    const leftPlat = this.add.rectangle(420, 360, 260, 26, 0x2a2f35, 1);
    leftPlat.setStrokeStyle(1, 0x111418, 1);
    this.physics.add.existing(leftPlat, true);
    this.platforms.add(leftPlat);

    const rightPlat = this.add.rectangle(1380, 300, 260, 26, 0x2a2f35, 1);
    rightPlat.setStrokeStyle(1, 0x111418, 1);
    this.physics.add.existing(rightPlat, true);
    this.platforms.add(rightPlat);

    this.playerBullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 80 });
    this.bossBullets = this.physics.add.group({ defaultKey: 'rottenFood', maxSize: 120 });

    this.player = new Player(this, 180, 380);

    this.physics.add.collider(this.player.sprite, this.platforms);

    this.boss = this.physics.add.sprite(1050, 345, this.textures.exists('boss_idle') ? 'boss_idle' : 'boss');
    this.boss.setImmovable(true);
    this.boss.body.setAllowGravity(false);
    this.boss.body.setSize(140, 160, true);

    this.bossHpMax = 36 + this.phaseIndex * 6;
    const savedHp = GameState.getBossHp(this.phaseIndex);
    this.bossHp = Number.isFinite(savedHp) && savedHp > 0 ? Math.min(this.bossHpMax, savedHp) : this.bossHpMax;
    this.bossEnraged = false;

    this._pattern = this.phaseIndex % 5;
    this._bossMoveTick = 0;

    this.physics.add.collider(this.playerBullets, this.platforms, (b) => {
      if (!b?.active) return;
      b.setActive(false);
      b.setVisible(false);
      b.body.enable = false;
    });

    this.physics.add.overlap(this.playerBullets, this.boss, (obj1, obj2) => {
      const bullet = this.playerBullets.contains(obj1) ? obj1 : this.playerBullets.contains(obj2) ? obj2 : null;
      if (!bullet?.active) return;

      bullet.setActive(false);
      bullet.setVisible(false);
      if (bullet.body) bullet.body.enable = false;

      const dmg = bullet.damage ?? 1;
      this._damageBoss(dmg);
    });

    this.physics.add.overlap(this.player.sprite, this.bossBullets, (_p, b) => {
      if (!b?.active) return;
      b.setActive(false);
      b.setVisible(false);
      b.body.enable = false;
      this.player.damage(1);
      this.cameras.main.shake(90, 0.006);
    });

    this._keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      jump: Phaser.Input.Keyboard.KeyCodes.UP,
      crouch: Phaser.Input.Keyboard.KeyCodes.DOWN,
      weaponShotgun: Phaser.Input.Keyboard.KeyCodes.X,
      weaponSmg: Phaser.Input.Keyboard.KeyCodes.C,
      shoot: Phaser.Input.Keyboard.KeyCodes.SPACE,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
    });

    this.hud = new HUD(this);
    this.hud.levelText.setText(`Fase ${this.phaseIndex + 1} — Chefão`);
    this.hud.setHelp('Chefão! Derrote o robozão. Ao chegar em 50% ele fica furioso.', 5000);

    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    this.cameras.main.setDeadzone(180, 120);

    this._bossNextShotAt = 0;
    this._bossNextBurstAt = 0;

    this.events.on('player_dead', () => {
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
      this.scene.restart();
    });

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  _createTexturesIfMissing() {
    if (!this.textures.exists('player_idle')) {
      const g = this.add.graphics();

      g.fillStyle(0x2c7be5, 1);
      g.fillRoundedRect(10, 18, 20, 20, 6);
      g.fillStyle(0xf2c9a0, 1);
      g.fillCircle(20, 12, 8);
      g.fillStyle(0x1a1f24, 1);
      g.fillRoundedRect(12, 3, 16, 8, 4);
      g.fillStyle(0x1a1f24, 1);
      g.fillRoundedRect(12, 36, 7, 14, 3);
      g.fillRoundedRect(21, 36, 7, 14, 3);
      g.fillStyle(0xf2c9a0, 1);
      g.fillRoundedRect(6, 20, 6, 16, 3);

      g.generateTexture('player_idle', 40, 52);
      g.destroy();
    }

    if (!this.textures.exists('player_run1')) {
      const g = this.add.graphics();
      g.fillStyle(0x2c7be5, 1);
      g.fillRoundedRect(10, 18, 20, 20, 6);
      g.fillStyle(0xf2c9a0, 1);
      g.fillCircle(20, 12, 8);
      g.fillStyle(0x1a1f24, 1);
      g.fillRoundedRect(12, 3, 16, 8, 4);
      g.fillStyle(0x1a1f24, 1);
      g.fillRoundedRect(10, 36, 8, 14, 3);
      g.fillRoundedRect(22, 38, 8, 12, 3);
      g.fillStyle(0xf2c9a0, 1);
      g.fillRoundedRect(5, 22, 6, 14, 3);
      g.fillRoundedRect(29, 22, 6, 14, 3);
      g.generateTexture('player_run1', 40, 52);
      g.destroy();
    }

    if (!this.textures.exists('player_run2')) {
      const g = this.add.graphics();
      g.fillStyle(0x2c7be5, 1);
      g.fillRoundedRect(10, 18, 20, 20, 6);
      g.fillStyle(0xf2c9a0, 1);
      g.fillCircle(20, 12, 8);
      g.fillStyle(0x1a1f24, 1);
      g.fillRoundedRect(12, 3, 16, 8, 4);
      g.fillStyle(0x1a1f24, 1);
      g.fillRoundedRect(12, 38, 8, 12, 3);
      g.fillRoundedRect(22, 36, 8, 14, 3);
      g.fillStyle(0xf2c9a0, 1);
      g.fillRoundedRect(6, 22, 6, 14, 3);
      g.fillRoundedRect(28, 22, 6, 14, 3);
      g.generateTexture('player_run2', 40, 52);
      g.destroy();
    }

    if (!this.textures.exists('player_crouch')) {
      const g = this.add.graphics();
      g.fillStyle(0x2c7be5, 1);
      g.fillRoundedRect(10, 24, 20, 16, 6);
      g.fillStyle(0xf2c9a0, 1);
      g.fillCircle(18, 18, 7);
      g.fillStyle(0x1a1f24, 1);
      g.fillRoundedRect(10, 10, 16, 7, 4);
      g.fillStyle(0x1a1f24, 1);
      g.fillRoundedRect(12, 38, 16, 10, 4);
      g.generateTexture('player_crouch', 40, 52);
      g.destroy();
    }

    if (!this.textures.exists('player_jump')) {
      const g = this.add.graphics();
      g.fillStyle(0x2c7be5, 1);
      g.fillRoundedRect(10, 18, 20, 20, 6);
      g.fillStyle(0xf2c9a0, 1);
      g.fillCircle(20, 12, 8);
      g.fillStyle(0x1a1f24, 1);
      g.fillRoundedRect(12, 3, 16, 8, 4);
      g.fillStyle(0x1a1f24, 1);
      g.fillRoundedRect(16, 36, 16, 10, 4);
      g.generateTexture('player_jump', 40, 52);
      g.destroy();
    }

    if (!this.textures.exists('player_shoot')) {
      const g = this.add.graphics();

      g.fillStyle(0x2c7be5, 1);
      g.fillRoundedRect(10, 18, 20, 20, 6);
      g.fillStyle(0xf2c9a0, 1);
      g.fillCircle(20, 12, 8);
      g.fillStyle(0x1a1f24, 1);
      g.fillRoundedRect(12, 3, 16, 8, 4);
      g.fillStyle(0x1a1f24, 1);
      g.fillRoundedRect(12, 36, 7, 14, 3);
      g.fillRoundedRect(21, 36, 7, 14, 3);
      // Tool + arm
      g.fillStyle(0x2c7be5, 1);
      g.fillRoundedRect(29, 22, 8, 10, 3);
      // Recycling tool (nozzle + recycle mark)
      g.fillStyle(0x2a7bd8, 1);
      g.fillRoundedRect(33, 23, 14, 6, 3);
      g.fillStyle(0x7bd389, 1);
      g.fillTriangle(39, 24, 45, 26, 39, 28);
      g.lineStyle(1, 0xeaeaea, 0.35);
      g.strokeRoundedRect(33.5, 23.5, 13, 5, 3);
      g.generateTexture('player_shoot', 52, 52);
      g.destroy();
    }

    if (!this.textures.exists('player_crouch_shoot')) {
      const g = this.add.graphics();
      g.fillStyle(0x2c7be5, 1);
      g.fillRoundedRect(10, 24, 20, 16, 6);
      g.fillStyle(0xf2c9a0, 1);
      g.fillCircle(18, 18, 7);
      g.fillStyle(0x1a1f24, 1);
      g.fillRoundedRect(10, 10, 16, 7, 4);
      g.fillStyle(0x1a1f24, 1);
      g.fillRoundedRect(12, 38, 16, 10, 4);
      // Tool + arm
      g.fillStyle(0x2c7be5, 1);
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
      g.lineStyle(2, 0x05230f, 0.95);
      g.strokeRoundedRect(1, 3, 12, 10, 5);
      g.fillStyle(0x16a34a, 1);
      g.fillRoundedRect(1, 3, 12, 10, 5);
      g.fillStyle(0x0b5a25, 1);
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
      g.lineStyle(2, 0x05230f, 0.95);
      g.strokeRoundedRect(1, 3, 14, 10, 5);
      g.fillStyle(0x16a34a, 1);
      g.fillRoundedRect(1, 3, 14, 10, 5);
      g.fillStyle(0x0b5a25, 1);
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

    if (!this.textures.exists('boss_idle')) {
      const g = this.add.graphics();

      const steel = 0x3a3f46;
      const steel2 = 0x2a2f35;
      const armor = 0xd6a93a;
      const armor2 = 0xb88928;
      const light = 0xff5a4f;

      // body base
      g.fillStyle(steel, 1);
      g.fillRoundedRect(50, 70, 120, 115, 26);

      // head + visor
      g.fillStyle(steel2, 1);
      g.fillRoundedRect(70, 28, 80, 56, 18);
      g.fillStyle(light, 1);
      g.fillRoundedRect(88, 42, 44, 18, 7);
      g.fillStyle(0xff8b6b, 0.6);
      g.fillCircle(154, 38, 12);

      // shoulders
      g.fillStyle(armor, 1);
      g.fillRoundedRect(24, 72, 56, 44, 14);
      g.fillRoundedRect(140, 72, 56, 44, 14);
      g.fillStyle(armor2, 0.5);
      g.fillRoundedRect(30, 80, 46, 30, 12);
      g.fillRoundedRect(146, 80, 46, 30, 12);

      // chest display
      g.fillStyle(0x14181d, 0.95);
      g.fillRoundedRect(78, 108, 64, 34, 10);
      g.fillStyle(0x2fb65e, 0.9);
      g.fillRoundedRect(104, 116, 28, 14, 5);
      g.fillStyle(0xf6c177, 0.9);
      g.fillRoundedRect(86, 116, 14, 14, 5);
      g.fillStyle(0xf6c177, 0.9);
      g.fillRoundedRect(86, 134, 14, 6, 3);

      // belt
      g.fillStyle(armor2, 1);
      g.fillRoundedRect(72, 150, 76, 18, 8);

      // arms + fists (idle)
      g.fillStyle(steel2, 1);
      g.fillRoundedRect(12, 116, 44, 62, 16);
      g.fillRoundedRect(164, 116, 44, 62, 16);
      g.fillStyle(steel, 1);
      g.fillRoundedRect(0, 150, 46, 44, 12);
      g.fillRoundedRect(174, 150, 46, 44, 12);

      // legs
      g.fillStyle(steel2, 1);
      g.fillRoundedRect(68, 178, 46, 68, 18);
      g.fillRoundedRect(106, 178, 46, 68, 18);
      g.fillStyle(armor, 0.95);
      g.fillRoundedRect(64, 208, 54, 42, 14);
      g.fillRoundedRect(104, 208, 54, 42, 14);

      // feet
      g.fillStyle(steel, 1);
      g.fillRoundedRect(52, 240, 74, 20, 8);
      g.fillRoundedRect(94, 240, 74, 20, 8);

      g.generateTexture('boss_idle', 220, 270);
      g.destroy();
    }

    if (!this.textures.exists('boss_punch')) {
      const g = this.add.graphics();

      const steel = 0x3a3f46;
      const steel2 = 0x2a2f35;
      const armor = 0xd6a93a;
      const armor2 = 0xb88928;
      const light = 0xff5a4f;

      // body base
      g.fillStyle(steel, 1);
      g.fillRoundedRect(50, 70, 120, 115, 26);

      // head + visor
      g.fillStyle(steel2, 1);
      g.fillRoundedRect(70, 28, 80, 56, 18);
      g.fillStyle(light, 1);
      g.fillRoundedRect(88, 42, 44, 18, 7);
      g.fillStyle(0xff8b6b, 0.6);
      g.fillCircle(154, 38, 12);

      // shoulders
      g.fillStyle(armor, 1);
      g.fillRoundedRect(24, 72, 56, 44, 14);
      g.fillRoundedRect(140, 72, 56, 44, 14);
      g.fillStyle(armor2, 0.5);
      g.fillRoundedRect(30, 80, 46, 30, 12);
      g.fillRoundedRect(146, 80, 46, 30, 12);

      // chest display
      g.fillStyle(0x14181d, 0.95);
      g.fillRoundedRect(78, 108, 64, 34, 10);
      g.fillStyle(0x2fb65e, 0.9);
      g.fillRoundedRect(104, 116, 28, 14, 5);
      g.fillStyle(0xf6c177, 0.9);
      g.fillRoundedRect(86, 116, 14, 14, 5);
      g.fillStyle(0xf6c177, 0.9);
      g.fillRoundedRect(86, 134, 14, 6, 3);

      // belt
      g.fillStyle(armor2, 1);
      g.fillRoundedRect(72, 150, 76, 18, 8);

      // left arm (back)
      g.fillStyle(steel2, 1);
      g.fillRoundedRect(12, 116, 44, 62, 16);
      g.fillStyle(steel, 1);
      g.fillRoundedRect(0, 150, 46, 44, 12);

      // right arm punch (forward)
      g.fillStyle(steel2, 1);
      g.fillRoundedRect(156, 116, 54, 54, 16);
      g.fillStyle(steel, 1);
      g.fillRoundedRect(184, 126, 66, 56, 14);
      g.fillStyle(0x000000, 0.12);
      g.fillRoundedRect(196, 138, 38, 32, 12);

      // legs
      g.fillStyle(steel2, 1);
      g.fillRoundedRect(68, 178, 46, 68, 18);
      g.fillRoundedRect(106, 178, 46, 68, 18);
      g.fillStyle(armor, 0.95);
      g.fillRoundedRect(64, 208, 54, 42, 14);
      g.fillRoundedRect(104, 208, 54, 42, 14);

      // feet
      g.fillStyle(steel, 1);
      g.fillRoundedRect(52, 240, 74, 20, 8);
      g.fillRoundedRect(94, 240, 74, 20, 8);

      g.generateTexture('boss_punch', 260, 270);
      g.destroy();
    }

    if (!this.textures.exists('boss')) {
      const g = this.add.graphics();
      g.fillStyle(0x6b6bff, 1);
      g.fillRoundedRect(0, 18, 160, 160, 16);
      g.fillRoundedRect(22, 0, 116, 56, 14);
      g.fillStyle(0x0b0e10, 0.22);
      g.fillRoundedRect(18, 44, 124, 90, 14);
      g.fillStyle(0xff6b6b, 0.95);
      g.fillCircle(62, 30, 8);
      g.fillCircle(98, 30, 8);
      g.fillStyle(0xf6c177, 0.9);
      g.fillRoundedRect(64, 82, 32, 16, 6);
      g.fillStyle(0x6b6bff, 1);
      g.fillRoundedRect(-26, 64, 38, 92, 12);
      g.fillRoundedRect(148, 64, 38, 92, 12);
      g.generateTexture('boss', 186, 186);
      g.destroy();
    }

    if (!this.textures.exists('rottenFood')) {
      const g = this.add.graphics();
      // Rotten food blob / spoiled leftovers
      g.lineStyle(2, 0x2b0d0d, 0.85);
      g.strokeRoundedRect(1, 2, 14, 12, 6);
      g.fillStyle(0x7a2d2d, 1);
      g.fillRoundedRect(1, 2, 14, 12, 6);
      g.fillStyle(0x4a7a2d, 0.95);
      g.fillRoundedRect(3, 4, 10, 7, 5);
      g.fillStyle(0x2a7bd8, 0.70);
      g.fillCircle(6, 9, 2);
      g.fillStyle(0xffe08a, 0.75);
      g.fillCircle(12, 7, 2);
      g.fillStyle(0xffffff, 0.12);
      g.fillRect(4, 5, 3, 1);
      g.fillStyle(0x7a2d2d, 1);
      g.fillTriangle(6, 1, 10, 1, 8, 4);
      g.generateTexture('rottenFood', 16, 16);
      g.destroy();
    }
  }

  _damageBoss(amount) {
    if (this.bossHp <= 0) return;
    this.bossHp = Math.max(0, this.bossHp - amount);
    GameState.setBossHp(this.phaseIndex, this.bossHp);

    AudioManager.sfx('bossHit');

    this.boss.setTint(0xffffff);
    this.time.delayedCall(80, () => {
      if (!this.boss.active) return;
      this.boss.clearTint();
    });

    if (!this.bossEnraged && this.bossHp <= this.bossHpMax / 2) {
      this.bossEnraged = true;
      this.cameras.main.flash(220, 255, 60, 60);
      this.hud.setHelp('O chefe ficou FURIOSO! Mais ataques, menos tempo de reação.', 4500);
      this.boss.setTint(0xff6b6b);
      this.time.delayedCall(600, () => {
        if (!this.boss.active) return;
        this.boss.clearTint();
      });
    }

    if (this.bossHp <= 0) {
      this._win();
    }
  }

  _win() {
    AudioManager.sfx('bossWin');
    GameState.clearBossHp(this.phaseIndex);
    // Unlock ODS for this phase and progress map
    let state = GameState.unlockOds(this.phaseIndex);
    const nextUnlocked = Math.max(state.unlockedPhaseIndex, Math.min(9, this.phaseIndex + 1));
    state = GameState.setProgress({
      phaseIndex: Math.min(9, this.phaseIndex + 1),
      unlockedPhaseIndex: nextUnlocked,
      subLevelIndex: 0,
    });

    const allDone = state.odsUnlocked.every(Boolean);
    this.hud.setHelp(allDone ? 'Todas as ODS conquistadas! O mundo pode se recuperar…' : 'ODS conquistada! Voltando ao mapa…', 5500);

    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.time.delayedCall(740, () => {
      if (allDone) {
        this.scene.start('Ending');
      } else {
        this.scene.start('OdsUnlock', { phaseIndex: this.phaseIndex });
      }
    });
  }

  _bossShootPattern() {
    const now = this.time.now;

    const difficulty = 1 + this.phaseIndex * 0.08;
    const baseCooldown = (this.bossEnraged ? 520 / difficulty : 820 / difficulty) * 1.35;
    if (now < this._bossNextShotAt) return;
    this._bossNextShotAt = now + baseCooldown;

    const originX = this.boss.x - 40;
    const originY = this.boss.y - 10;

    const dx = this.player.sprite.x - originX;
    const dy = (this.player.sprite.y - 10) - originY;
    const ang = Math.atan2(dy, dx);

    const speed = (this.bossEnraged ? 420 : 340) * (1 + this.phaseIndex * 0.04);
    const spread = this.bossEnraged ? 0.52 : 0.28;

    if (this.textures.exists('boss_punch')) {
      this.boss.setTexture('boss_punch');
      this.time.delayedCall(140, () => {
        if (!this.boss?.active) return;
        if (this.textures.exists('boss_idle')) this.boss.setTexture('boss_idle');
      });
    }

    const fireBullet = (x, y, vx, vy, life = 2200) => {
      const b = this.bossBullets.get(x, y, 'rottenFood');
      if (!b) return;
      b.setActive(true);
      b.setVisible(true);
      b.body.enable = true;
      b.body.setAllowGravity(false);
      b.body.setVelocity(vx, vy);
      b.lifespan = now + life;
    };

    // 5 patterns * 2 moods (calm/enraged) = 10 variations
    switch (this._pattern) {
      case 0: {
        // Classic aimed spread
        const shots = (this.bossEnraged ? 6 : 3) + (this.phaseIndex >= 6 ? 1 : 0);
        for (let i = 0; i < shots; i++) {
          const a = ang + (i - (shots - 1) / 2) * (spread / Math.max(1, shots - 1));
          fireBullet(originX, originY, Math.cos(a) * speed, Math.sin(a) * speed);
        }
        break;
      }
      case 1: {
        // Circular burst (Cuphead-ish)
        const burst = this.bossEnraged ? 12 : 8;
        for (let i = 0; i < burst; i++) {
          const a = (i / burst) * Math.PI * 2;
          fireBullet(originX, originY, Math.cos(a) * (speed * 0.75), Math.sin(a) * (speed * 0.75), 1800);
        }
        break;
      }
      case 2: {
        // Rain from above near the player
        const drops = this.bossEnraged ? 8 : 5;
        for (let i = 0; i < drops; i++) {
          const dx = (i - (drops - 1) / 2) * (this.bossEnraged ? 26 : 32);
          const rx = Phaser.Math.Clamp(this.player.sprite.x + dx, 60, 1740);
          fireBullet(rx, 40, 0, speed * 0.9, 2400);
        }
        break;
      }
      case 3: {
        // Zigzag: two angled streams
        const shots = this.bossEnraged ? 6 : 4;
        for (let i = 0; i < shots; i++) {
          const a1 = ang + 0.22;
          const a2 = ang - 0.22;
          const mul = 0.75 + i * 0.06;
          fireBullet(originX, originY, Math.cos(a1) * speed * mul, Math.sin(a1) * speed * mul);
          fireBullet(originX, originY, Math.cos(a2) * speed * mul, Math.sin(a2) * speed * mul);
        }
        break;
      }
      case 4: {
        // Fast triple sniper
        const shots = this.bossEnraged ? 5 : 3;
        for (let i = 0; i < shots; i++) {
          const mul = this.bossEnraged ? 1.15 : 1.0;
          const a = ang + (Math.random() - 0.5) * (this.bossEnraged ? 0.12 : 0.08);
          fireBullet(originX, originY, Math.cos(a) * speed * mul, Math.sin(a) * speed * mul);
        }
        break;
      }
      default:
        break;
    }

    if (this.bossEnraged) {
      this.cameras.main.shake(70, 0.0035);
    }
  }

  _bossMovePattern() {
    // Subtle movement to make bosses feel different per phase
    this._bossMoveTick += 1;
    const t = this._bossMoveTick * 0.016;
    const amp = 22 + this.phaseIndex * 2;
    const spd = 0.7 + this.phaseIndex * 0.02;
    const baseY = 345;
    this.boss.y = baseY + Math.sin(t * spd) * amp;
    this.boss.body.updateFromGameObject();
  }

  update() {
    const now = this.time.now;

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

    this._bossMovePattern();

    this._bossShootPattern();

    this.playerBullets.children.each((b) => {
      if (!b.active) return;
      if (b.lifespan && now > b.lifespan) {
        b.setActive(false);
        b.setVisible(false);
        b.body.enable = false;
      }
    });

    this.bossBullets.children.each((b) => {
      if (!b.active) return;
      if (b.lifespan && now > b.lifespan) {
        b.setActive(false);
        b.setVisible(false);
        b.body.enable = false;
      }
    });

    if (Phaser.Input.Keyboard.JustDown(this._keys.restart)) {
      this.scene.restart();
    }

    this.hud.update({
      hp: this.player.hp,
      hpMax: this.player.hpMax,
      weapon: this.player.weapon,
      levelName: 'Boss',
      lives: Math.max(0, 7 - (GameState.load().deathCount ?? 0)),
      livesMax: 7,
    });

    const bossBar = `Chefe: ${'█'.repeat(Math.ceil((this.bossHp / this.bossHpMax) * 12)).padEnd(12, '░')}`;
    this.hud.levelText.setText(`Boss — ${bossBar}`);
  }
}
