class Bullet {
  constructor({
    x,
    y,
    velocityX,
    velocityY = 0,
    radius = 4,
    damage = 1,
    ownerId,
    tint = null,
    glow = null,
    spriteScale = 1,
    elongated = false,
  }) {
    this.x = x;
    this.y = y;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.radius = radius;
    this.damage = damage;
    this.ownerId = ownerId;
    this.tint = tint;
    this.glow = glow;
    this.spriteScale = spriteScale;
    this.elongated = elongated;
    this.active = true;
  }

  update(delta, width, height = Infinity) {
    this.x += this.velocityX * delta;
    this.y += this.velocityY * delta;
    if (this.x - this.radius > width + 32 || this.x + this.radius < -32 || this.y + this.radius < -32 || this.y - this.radius > height + 32) {
      this.active = false;
    }
  }

  draw(ctx, assets) {
    ctx.save();
    if (this.glow) {
      ctx.shadowColor = this.glow;
      ctx.shadowBlur = 16;
    }
    if (assets?.atlasImage) {
      const sprite = assets.spriteMap.bullet;
      const width = (this.elongated ? 30 : 24) * this.spriteScale;
      const height = (this.elongated ? 12 : 8) * this.spriteScale;
      if (this.tint) {
        ctx.translate(this.x, this.y);
        ctx.fillStyle = this.tint;
        ctx.beginPath();
        ctx.ellipse(0, 0, width * 0.52, height * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        ctx.beginPath();
        ctx.ellipse(-width * 0.12, -height * 0.1, width * 0.16, height * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
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
      }
    } else {
      ctx.fillStyle = this.tint || "#ffe066";
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
