class HealingPickup {
  constructor({ x, y, speed = 120, healAmount = 25 }) {
    this.x = x;
    this.baseY = y;
    this.y = y;
    this.speed = speed;
    this.healAmount = healAmount;
    this.width = 62;
    this.height = 48;
    this.phase = Math.random() * Math.PI * 2;
    this.active = true;
  }

  update(delta) {
    this.x -= this.speed * delta;
    this.phase += delta * 3.2;
    this.y = this.baseY + Math.sin(this.phase) * 9;

    if (this.x + this.width < -32) {
      this.active = false;
    }
  }

  draw(ctx, assets) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const pulse = 1 + Math.sin(this.phase * 1.6) * 0.05;
    ctx.scale(pulse, pulse);
    ctx.shadowColor = "rgba(34, 197, 94, 0.75)";
    ctx.shadowBlur = 18;

    if (assets?.healingImage) {
      ctx.drawImage(
        assets.healingImage,
        -this.width * 0.62,
        -this.height * 0.62,
        this.width * 1.24,
        this.height * 1.24,
      );
    } else {
      ctx.fillStyle = "#f5f5dc";
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(-5, -16, 10, 32);
      ctx.fillRect(-16, -5, 32, 10);
    }

    ctx.restore();
  }
}

window.HealingPickup = HealingPickup;
