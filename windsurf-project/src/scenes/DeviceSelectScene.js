export class DeviceSelectScene extends Phaser.Scene {
  constructor() {
    super('DeviceSelect');
  }

  create() {
    this.scene.start('Intro');
  }
}
