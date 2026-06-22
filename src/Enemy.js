class Enemy {
  constructor({
    x,
    y,
    speed,
    scale = 1,
    health = 3,
    damage = 18,
    scoreValue = 30,
    kind = "swimmer",
    fireCooldown = 1.7,
    bulletSpeed = -280,
    bulletDamage = 10,
  }) {
    this.type = "enemy";
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.scale = scale;
    this.health = health;
    this.maxHealth = health;
    this.damage = damage;
    this.scoreValue = scoreValue;
    this.kind = kind;
    this.width = (kind === "shooter" ? 84 : 72) * scale;
    this.height = (kind === "shooter" ? 40 : 36) * scale;
    this.fireCooldown = fireCooldown;
    this.fireTimer = fireCooldown * (0.35 + Math.random() * 0.45);
    this.bulletSpeed = bulletSpeed;
    this.bulletDamage = bulletDamage;
    this.active = true;
  }

  update(delta) {
    this.x -= this.speed * delta;
    if (this.kind === "shooter") {
      this.fireTimer -= delta;
    }
    if (this.x + this.width < -48) {
      this.active = false;
    }
  }

  canShoot() {
    return this.kind === "shooter" && this.active && this.fireTimer <= 0 && this.x < 1080;
  }

  shoot() {
    this.fireTimer = this.fireCooldown;
    return new Bullet({
      x: this.x - this.width * 0.48,
      y: this.y + this.height * 0.02,
      velocityX: this.bulletSpeed,
      radius: 4,
      damage: this.bulletDamage,
      ownerId: "enemy",
    });
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
    if (this.kind === "shooter" && assets?.codShooterImage) {
      ctx.drawImage(
        assets.codShooterImage,
        -this.width * 0.72,
        -this.height * 0.8,
        this.width * 1.44,
        this.height * 1.6,
      );
    } else if (assets?.atlasImage) {
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
