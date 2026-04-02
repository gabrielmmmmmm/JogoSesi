import { AudioManager } from '../audio/AudioManager.js';

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'player_idle');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setMaxVelocity(520, 900);
    this.sprite.setDragX(1500);

    this.baseSpeed = 145;
    this.jumpVelocity = 575;

    this.isCrouching = false;

    this.hpMax = 5;
    this.hp = this.hpMax;
    this.invulnUntil = 0;

    this.weapon = 'shotgun';
    this.lastShotAt = 0;

    this._runAnimTick = 0;

    this._setBodyStanding();
  }

  _setBodyStanding() {
    this.isCrouching = false;
    this.sprite.body.setSize(22, 34, true);
    this.sprite.body.setOffset(5, 6);
  }

  _setBodyCrouching() {
    this.isCrouching = true;
    this.sprite.body.setSize(22, 22, true);
    this.sprite.body.setOffset(5, 18);
  }

  setWeapon(weapon) {
    if (weapon !== 'shotgun' && weapon !== 'smg') return;
    this.weapon = weapon;
  }

  damage(amount) {
    const now = this.scene.time.now;
    if (now < this.invulnUntil) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnUntil = now + 700;
    AudioManager.sfx('damage');
    this.sprite.setTint(0xff6b6b);
    this.scene.time.delayedCall(180, () => {
      if (!this.sprite.active) return;
      this.sprite.clearTint();
    });
  }

  tryShoot() {
    const now = this.scene.time.now;

    const config =
      this.weapon === 'shotgun'
        ? { cooldown: 380, bullets: 5, spread: 0.22, speed: 720, damage: 1 }
        : { cooldown: 90, bullets: 1, spread: 0.04, speed: 760, damage: 1 };

    const projectileKey = this.weapon === 'shotgun' ? 'trashBagPellet' : 'trashBagBolt';

    if (now - this.lastShotAt < config.cooldown) return;
    this.lastShotAt = now;
    AudioManager.sfx('shoot');

    const dir = this.sprite.flipX ? -1 : 1;
    const originX = this.sprite.x + dir * 18;
    const originY = this.sprite.y - (this.isCrouching ? 2 : 8);

    for (let i = 0; i < config.bullets; i++) {
      const angle = (dir === 1 ? 0 : Math.PI) + (Math.random() - 0.5) * config.spread;
      const vx = Math.cos(angle) * config.speed;
      const vy = Math.sin(angle) * config.speed;

      const b = this.scene.playerBullets.get(originX, originY, projectileKey);
      if (!b) continue;
      b.setActive(true);
      b.setVisible(true);
      b.body.enable = true;
      b.body.setAllowGravity(false);
      b.body.setVelocity(vx, vy);
      b.damage = config.damage;
      b.lifespan = now + 650;
      b.setRotation(angle);
    }
  }

  update(input) {
    const body = this.sprite.body;

    if (!body) return;

    const onFloor = body.blocked.down || body.touching.down;

    if (input.crouch.isDown && onFloor) {
      if (!this.isCrouching) this._setBodyCrouching();
    } else if (this.isCrouching) {
      this._setBodyStanding();
    }

    const speed = this.isCrouching ? this.baseSpeed * 0.55 : this.baseSpeed;

    if (input.left.isDown) {
      this.sprite.setAccelerationX(-speed * 7);
      this.sprite.setFlipX(true);
    } else if (input.right.isDown) {
      this.sprite.setAccelerationX(speed * 7);
      this.sprite.setFlipX(false);
    } else {
      this.sprite.setAccelerationX(0);
    }

    if (input.jump.justDown && onFloor) {
      this.sprite.setVelocityY(-this.jumpVelocity);
    }

    if (input.weaponShotgun.justDown) {
      this.setWeapon('shotgun');
    }
    if (input.weaponSmg.justDown) {
      this.setWeapon('smg');
    }

    if (input.shoot.isDown) {
      this.tryShoot();
    }

    // Visual state
    const now = this.scene.time.now;
    const isShootingPose = now - this.lastShotAt < 140;

    if (!onFloor) {
      if (this.sprite.texture.key !== 'player_jump') this.sprite.setTexture('player_jump');
    } else if (this.isCrouching) {
      const crouchKey = isShootingPose ? 'player_crouch_shoot' : 'player_crouch';
      if (this.sprite.texture.key !== crouchKey) this.sprite.setTexture(crouchKey);
    } else {
      const moving = Math.abs(body.velocity.x) > 40;
      if (!moving) {
        const idleKey = isShootingPose ? 'player_shoot' : 'player_idle';
        if (this.sprite.texture.key !== idleKey) this.sprite.setTexture(idleKey);
      } else {
        if (isShootingPose) {
          if (this.sprite.texture.key !== 'player_shoot') this.sprite.setTexture('player_shoot');
        } else {
          this._runAnimTick = (this._runAnimTick + 1) % 12;
          const runKey = this._runAnimTick < 6 ? 'player_run1' : 'player_run2';
          if (this.sprite.texture.key !== runKey) this.sprite.setTexture(runKey);
        }
      }
    }

    if (this.hp <= 0) {
      this.scene.events.emit('player_dead');
    }
  }
}
