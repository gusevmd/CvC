const ENEMY_ARCHETYPES = {
  swimmer: {
    width: 72,
    height: 36,
    behavior: "swimmer",
    assetKey: null,
  },
  shooter: {
    width: 84,
    height: 40,
    behavior: "aimed-single",
    assetKey: "codShooterImage",
    fireCooldown: 1.7,
    bulletSpeed: -280,
    bulletDamage: 10,
    hover: true,
  },
  grunt: {
    width: 92,
    height: 46,
    behavior: "burst",
    assetKey: "codGruntImage",
    fireCooldown: 1.5,
    bulletSpeed: -340,
    bulletDamage: 6,
    hover: true,
    burstShots: 4,
    burstInterval: 0.08,
  },
  bazooka: {
    width: 104,
    height: 50,
    behavior: "rocket",
    assetKey: "codBazookaImage",
    fireCooldown: 2.25,
    bulletSpeed: -250,
    bulletDamage: 14,
    explosionRadius: 72,
    hover: true,
  },
};

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
    fireCooldown = null,
    bulletSpeed = null,
    bulletDamage = null,
  }) {
    const archetype = ENEMY_ARCHETYPES[kind] || ENEMY_ARCHETYPES.swimmer;
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
    this.behavior = archetype.behavior;
    this.assetKey = archetype.assetKey;
    this.width = archetype.width * scale;
    this.height = archetype.height * scale;
    this.fireCooldown = fireCooldown ?? archetype.fireCooldown ?? 1.7;
    this.fireTimer = this.fireCooldown * (0.35 + Math.random() * 0.45);
    this.bulletSpeed = bulletSpeed ?? archetype.bulletSpeed ?? -280;
    this.bulletDamage = bulletDamage ?? archetype.bulletDamage ?? 10;
    this.explosionRadius = archetype.explosionRadius || 0;
    this.burstShots = archetype.burstShots || 1;
    this.burstInterval = archetype.burstInterval || 0.08;
    this.burstShotsRemaining = 0;
    this.burstTimer = 0;
    this.usesHover = Boolean(archetype.hover);
    this.baseY = y;
    this.hoverPhase = Math.random() * Math.PI * 2;
    this.hoverAmplitude = 0.3 + Math.random() * 0.7;
    this.flashTimer = 0;
    this.active = true;
  }

  update(delta) {
    const shots = [];
    this.x -= this.speed * delta;
    this.flashTimer = Math.max(0, this.flashTimer - delta);
    if (this.behavior !== "swimmer") {
      this.fireTimer -= delta;
      this.burstTimer -= delta;
    }
    if (this.usesHover) {
      this.hoverPhase += delta * (1.6 + this.hoverAmplitude);
      this.y = this.baseY + Math.sin(this.hoverPhase) * (18 + this.hoverAmplitude * 22) + Math.sin(this.hoverPhase * 0.45) * 10;
    }

    if (this.x < 1080) {
      if (this.behavior === "aimed-single" && this.fireTimer <= 0) {
        shots.push(this.createSingleShot(0));
      } else if (this.behavior === "burst") {
        if (this.burstShotsRemaining <= 0 && this.fireTimer <= 0) {
          this.burstShotsRemaining = this.burstShots;
          this.burstTimer = 0;
          this.fireTimer = this.fireCooldown;
        }
        if (this.burstShotsRemaining > 0 && this.burstTimer <= 0) {
          const spreadY = (-24 + Math.random() * 48) * 0.6;
          shots.push(this.createSingleShot(spreadY));
          this.burstShotsRemaining -= 1;
          this.burstTimer = this.burstShotsRemaining > 0 ? this.burstInterval : 0;
        }
      } else if (this.behavior === "rocket" && this.fireTimer <= 0) {
        shots.push(this.createRocketShot());
      }
    }

    if (this.x + this.width < -48) {
      this.active = false;
    }
    return shots;
  }

  createSingleShot(spreadY = 0) {
    this.fireTimer = this.fireCooldown;
    return new Bullet({
      x: this.x - this.width * 0.48,
      y: this.y + this.height * 0.02 + spreadY * 0.1,
      velocityX: this.bulletSpeed,
      velocityY: spreadY,
      radius: 4,
      damage: this.bulletDamage,
      ownerId: "enemy",
      tint: this.kind === "grunt" ? "#fde047" : null,
      glow: this.kind === "grunt" ? "rgba(253, 224, 71, 0.72)" : null,
    });
  }

  createRocketShot() {
    this.fireTimer = this.fireCooldown;
    return new Bullet({
      x: this.x - this.width * 0.5,
      y: this.y - 4,
      velocityX: this.bulletSpeed,
      radius: 7,
      damage: this.bulletDamage,
      ownerId: "enemy",
      explosionRadius: this.explosionRadius,
      isRocket: true,
      tint: "#fb923c",
      glow: "rgba(251, 146, 60, 0.85)",
      spriteScale: 1.1,
      elongated: true,
    });
  }

  takeDamage(amount) {
    this.health -= amount;
    this.flashTimer = 0.09;
    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  draw(ctx, assets) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.flashTimer > 0) {
      ctx.filter = "brightness(2.6) saturate(0.2)";
    }
    if (this.assetKey && assets?.[this.assetKey]) {
      ctx.drawImage(
        assets[this.assetKey],
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

    if (this.flashTimer > 0) {
      ctx.globalAlpha = Math.min(0.42, this.flashTimer * 5);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(0, 0, this.width * 0.58, this.height * 0.58, 0, 0, Math.PI * 2);
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
    this.spreadChargeDuration = 0.58;
    this.aimChargeDuration = 0.72;
    this.spreadChargeTimer = 0;
    this.aimChargeTimer = 0;
    this.pendingSpreadShot = false;
    this.pendingAimShot = false;
    this.secondPhase = false;
    this.recoilTimer = 0;
    this.telegraphTarget = null;
    this.active = true;
  }

  update(delta, player) {
    const shots = [];
    this.x += (this.anchorX - this.x) * Math.min(1, delta * 2.2);
    this.phase += delta * 1.25;
    this.y = this.baseY + Math.sin(this.phase) * 118 + Math.sin(this.phase * 0.46) * 34;
    this.y = Math.max(140, Math.min(this.worldHeight - 140, this.y));
    this.recoilTimer = Math.max(0, this.recoilTimer - delta);

    if (!this.secondPhase && this.health <= this.maxHealth * 0.45) {
      this.secondPhase = true;
      this.spreadTimer = Math.min(this.spreadTimer, 0.45);
      this.aimTimer = Math.min(this.aimTimer, 0.9);
    }

    if (Math.abs(this.x - this.anchorX) > 24) {
      return shots;
    }

    this.spreadTimer -= delta;
    this.aimTimer -= delta;

    if (!this.pendingSpreadShot && this.spreadTimer <= 0) {
      this.pendingSpreadShot = true;
      this.spreadChargeTimer = this.spreadChargeDuration;
    }

    if (this.pendingSpreadShot) {
      this.spreadChargeTimer -= delta;
    }

    if (this.pendingSpreadShot && this.spreadChargeTimer <= 0) {
      this.pendingSpreadShot = false;
      this.spreadTimer = this.secondPhase ? 0.92 : 1.28;
      this.recoilTimer = 0.16;
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

    if (!this.pendingAimShot && this.aimTimer <= 0 && player) {
      this.pendingAimShot = true;
      this.aimChargeTimer = this.aimChargeDuration;
      this.telegraphTarget = { x: player.x, y: player.y };
    }

    if (this.pendingAimShot) {
      this.aimChargeTimer -= delta;
      if (player) {
        this.telegraphTarget = { x: player.x, y: player.y };
      }
    }

    if (this.pendingAimShot && this.aimChargeTimer <= 0 && this.telegraphTarget) {
      this.pendingAimShot = false;
      this.aimTimer = this.secondPhase ? 1.95 : 2.7;
      this.recoilTimer = 0.2;
      const dx = this.telegraphTarget.x - this.x;
      const dy = this.telegraphTarget.y - this.y;
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
    const recoilOffset = this.recoilTimer > 0 ? this.recoilTimer * 48 : 0;
    ctx.translate(this.x + recoilOffset, this.y);

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

    if (this.pendingAimShot) {
      const progress = 1 - this.aimChargeTimer / this.aimChargeDuration;
      ctx.globalAlpha = 0.6 + progress * 0.35;
      ctx.fillStyle = "#fb7185";
      ctx.beginPath();
      ctx.arc(-this.width * 0.42, -8, 10 + progress * 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(-this.width * 0.42, -8, 4 + progress * 6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.pendingSpreadShot) {
      const progress = 1 - this.spreadChargeTimer / this.spreadChargeDuration;
      ctx.globalAlpha = 0.52 + progress * 0.4;
      ctx.fillStyle = "#f97316";
      [-24, -4, 16].forEach((offsetY) => {
        ctx.beginPath();
        ctx.arc(-this.width * 0.42, offsetY, 7 + progress * 10, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  }

  drawTelegraph(ctx) {
    if (this.pendingSpreadShot) {
      const progress = 1 - this.spreadChargeTimer / this.spreadChargeDuration;
      const alpha = 0.18 + progress * 0.4;
      const startX = this.x - this.width * 0.42;
      const startY = this.y - 8;

      ctx.save();
      ctx.strokeStyle = `rgba(249, 115, 22, ${alpha})`;
      ctx.lineWidth = 2 + progress * 3;
      [-0.58, -0.22, 0, 0.22, 0.58].forEach((angle) => {
        const length = 360;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX - Math.cos(angle) * length, startY + Math.sin(angle) * length);
        ctx.stroke();
      });
      ctx.restore();
    }

    if (!this.pendingAimShot || !this.telegraphTarget) {
      return;
    }

    const progress = 1 - this.aimChargeTimer / this.aimChargeDuration;
    const alpha = 0.24 + progress * 0.5;
    const startX = this.x - this.width * 0.42;
    const startY = this.y - 8;

    ctx.save();
    ctx.strokeStyle = `rgba(251, 113, 133, ${alpha})`;
    ctx.lineWidth = 2 + progress * 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(this.telegraphTarget.x, this.telegraphTarget.y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.telegraphTarget.x, this.telegraphTarget.y, 14 + progress * 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

window.BossEnemy = BossEnemy;
