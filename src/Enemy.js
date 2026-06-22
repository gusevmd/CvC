class Enemy {
  constructor({ x, y, speed, scale = 1, health = 3, damage = 18, scoreValue = 30 }) {
    this.type = "enemy";
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.scale = scale;
    this.health = health;
    this.maxHealth = health;
    this.damage = damage;
    this.scoreValue = scoreValue;
    this.width = 84 * scale;
    this.height = 42 * scale;
    this.active = true;
  }

  update(delta) {
    this.x -= this.speed * delta;
    if (this.x + this.width < -48) {
      this.active = false;
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  draw(ctx, assets) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (assets?.atlasImage) {
      const sprite = this.scale > 1.2 ? assets.spriteMap.bigCod : assets.spriteMap.enemyCod;
      ctx.drawImage(
        assets.atlasImage,
        sprite.sx,
        sprite.sy,
        sprite.sw,
        sprite.sh,
        -this.width * 0.6,
        -this.height * 0.65,
        this.width * 1.2,
        this.height * 1.3,
      );
    } else {
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.ellipse(0, 0, this.width * 0.42, this.height * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.moveTo(this.width * 0.1, 0);
      ctx.lineTo(this.width * 0.42, -this.height * 0.35);
      ctx.lineTo(this.width * 0.42, this.height * 0.35);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

window.Enemy = Enemy;
