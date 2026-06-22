class CoinPickup {
  constructor({ x, y, amount = 1, speed = 118, velocityX = 0, velocityY = 0 }) {
    this.x = x;
    this.baseY = y;
    this.y = y;
    this.amount = amount;
    this.speed = speed;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.width = 42;
    this.height = 42;
    this.phase = Math.random() * Math.PI * 2;
    this.active = true;
  }

  update(delta) {
    this.x -= this.speed * delta;
    this.x += this.velocityX * delta;
    this.baseY += this.velocityY * delta;
    this.velocityX *= Math.pow(0.9, delta * 60);
    this.velocityY *= Math.pow(0.9, delta * 60);
    this.phase += delta * 4.2;
    this.y = this.baseY + Math.sin(this.phase) * 8;

    if (this.x + this.width < -32) {
      this.active = false;
    }
  }

  draw(ctx, assets) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const pulse = 1 + Math.sin(this.phase * 1.8) * 0.08;
    ctx.scale(pulse, pulse);
    ctx.shadowColor = "rgba(250, 204, 21, 0.72)";
    ctx.shadowBlur = 18;

    if (assets?.coinImage) {
      ctx.drawImage(
        assets.coinImage,
        -this.width * 0.72,
        -this.height * 0.72,
        this.width * 1.44,
        this.height * 1.44,
      );
    } else {
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(0, 0, this.width * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

window.CoinPickup = CoinPickup;
