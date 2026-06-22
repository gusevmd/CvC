class UpgradePickup {
  constructor({ x, y, speed = 118 }) {
    this.x = x;
    this.baseY = y;
    this.y = y;
    this.speed = speed;
    this.width = 52;
    this.height = 52;
    this.phase = Math.random() * Math.PI * 2;
    this.active = true;
  }

  update(delta) {
    this.x -= this.speed * delta;
    this.phase += delta * 3.8;
    this.y = this.baseY + Math.sin(this.phase) * 10;

    if (this.x + this.width < -32) {
      this.active = false;
    }
  }

  draw(ctx, assets) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const pulse = 1 + Math.sin(this.phase * 1.8) * 0.06;
    ctx.scale(pulse, pulse);
    ctx.shadowColor = "rgba(249, 115, 22, 0.78)";
    ctx.shadowBlur = 20;

    if (assets?.upgradeImage) {
      ctx.drawImage(
        assets.upgradeImage,
        -this.width * 0.7,
        -this.height * 0.7,
        this.width * 1.4,
        this.height * 1.4,
      );
    } else {
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(0, 0, this.width * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff7ed";
      ctx.fillRect(-15, -5, 30, 10);
      ctx.fillRect(-5, -15, 10, 30);
    }

    ctx.restore();
  }
}

window.UpgradePickup = UpgradePickup;
