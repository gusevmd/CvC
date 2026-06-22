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
    this.baseY = y;
    this.hoverPhase = Math.random() * Math.PI * 2;
    this.hoverAmplitude = 0.3 + Math.random() * 0.7;
    this.active = true;
  }

  update(delta) {
    this.x -= this.speed * delta;
    if (this.kind === "shooter") {
      this.fireTimer -= delta;
      this.hoverPhase += delta * (1.6 + this.hoverAmplitude);
      this.y = this.baseY + Math.sin(this.hoverPhase) * (18 + this.hoverAmplitude * 22) + Math.sin(this.hoverPhase * 0.45) * 10;
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

class BossEnemy {
  constructor({ x, y, worldWidth, worldHeight, health = 90 }) {
    this.type = "boss";
    this.x = x;
    this.y = y;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.health = health;
    this.maxHealth = health;
    this.width = 228;
    this.height = 156;
    this.anchorX = worldWidth - 180;
    this.baseY = y;
    this.phase = Math.random() * Math.PI * 2;
    this.spreadTimer = 1.25;
    this.aimTimer = 2.4;
    this.active = true;
  }

  update(delta, player) {
    const shots = [];
    this.x += (this.anchorX - this.x) * Math.min(1, delta * 2.2);
    this.phase += delta * 1.25;
    this.y = this.baseY + Math.sin(this.phase) * 118 + Math.sin(this.phase * 0.46) * 34;
    this.y = Math.max(140, Math.min(this.worldHeight - 140, this.y));

    if (Math.abs(this.x - this.anchorX) > 24) {
      return shots;
    }

    this.spreadTimer -= delta;
    this.aimTimer -= delta;

    if (this.spreadTimer <= 0) {
      this.spreadTimer = 1.28;
      const velocities = [-160, -84, 0, 84, 160];
      velocities.forEach((velocityY) => {
        shots.push(new Bullet({
          x: this.x - this.width * 0.48,
          y: this.y - 8,
          velocityX: -255,
          velocityY,
          radius: 5,
          damage: 10,
          ownerId: "boss",
        }));
      });
    }

    if (this.aimTimer <= 0 && player) {
      this.aimTimer = 2.7;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const speed = 340;
      const baseVX = (dx / length) * speed;
      const baseVY = (dy / length) * speed;
      [-36, 36].forEach((spreadY) => {
        shots.push(new Bullet({
          x: this.x - this.width * 0.52,
          y: this.y + spreadY * 0.15,
          velocityX: baseVX,
          velocityY: baseVY + spreadY,
          radius: 7,
          damage: 14,
          ownerId: "boss",
          tint: "#fb7185",
          glow: "rgba(251, 113, 133, 0.85)",
          spriteScale: 1.18,
          elongated: true,
        }));
      });
    }

    return shots;
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

    if (assets?.bossImage) {
      ctx.drawImage(
        assets.bossImage,
        -this.width * 0.72,
        -this.height * 0.82,
        this.width * 1.44,
        this.height * 1.64,
      );
    } else {
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.ellipse(0, 0, this.width * 0.44, this.height * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

window.BossEnemy = BossEnemy;
