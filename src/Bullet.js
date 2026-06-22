class Bullet {
  constructor({ x, y, velocityX, radius = 4, damage = 1, ownerId }) {
    this.x = x;
    this.y = y;
    this.velocityX = velocityX;
    this.radius = radius;
    this.damage = damage;
    this.ownerId = ownerId;
    this.active = true;
  }

  update(delta, width) {
    this.x += this.velocityX * delta;
    if (this.x - this.radius > width + 32 || this.x + this.radius < -32) {
      this.active = false;
    }
  }

  draw(ctx, assets) {
    ctx.save();
    if (assets?.atlasImage) {
      const sprite = assets.spriteMap.bullet;
      const width = 24;
      const height = 8;
      ctx.drawImage(
        assets.atlasImage,
        sprite.sx,
        sprite.sy,
        sprite.sw,
        sprite.sh,
        this.x - width * 0.5,
        this.y - height * 0.5,
        width,
        height,
      );
    } else {
      ctx.fillStyle = "#ffe066";
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(this.x - 2, this.y - 1, this.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

window.Bullet = Bullet;
