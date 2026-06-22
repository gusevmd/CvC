class Player {
  constructor({
    id,
    x,
    y,
    canvasHeight,
    controls = { riseKey: "Space" },
    classId = window.PlayerClasses.defaultId,
  }) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.canvasHeight = canvasHeight;
    this.controls = controls;
    this.classId = classId;
    this.classConfig = window.PlayerClasses.getConfig(classId);
    this.width = 84;
    this.height = 48;
    this.velocityY = 0;
    this.riseAcceleration = this.classConfig.riseAcceleration;
    this.fallAcceleration = this.classConfig.fallAcceleration;
    this.maxRiseSpeed = this.classConfig.maxRiseSpeed;
    this.maxFallSpeed = this.classConfig.maxFallSpeed;
    this.maxHealth = this.classConfig.maxHealth;
    this.health = this.maxHealth;
    this.fireCooldown = this.classConfig.fireCooldown;
    this.fireTimer = 0;
    this.hasDoubleShot = false;
    this.invulnerabilityDuration = this.classConfig.invulnerabilityDuration;
    this.invulnerabilityTimer = 0;
    this.isPressingRise = false;
    this.active = true;
  }

  applyClass(classId) {
    this.classId = classId;
    this.classConfig = window.PlayerClasses.getConfig(classId);
    this.riseAcceleration = this.classConfig.riseAcceleration;
    this.fallAcceleration = this.classConfig.fallAcceleration;
    this.maxRiseSpeed = this.classConfig.maxRiseSpeed;
    this.maxFallSpeed = this.classConfig.maxFallSpeed;
    this.maxHealth = this.classConfig.maxHealth;
    this.fireCooldown = this.classConfig.fireCooldown;
    this.invulnerabilityDuration = this.classConfig.invulnerabilityDuration;
    this.health = Math.min(this.health, this.maxHealth);
  }

  reset(y) {
    this.y = y;
    this.velocityY = 0;
    this.applyClass(this.classId);
    this.health = this.maxHealth;
    this.fireTimer = 0;
    this.hasDoubleShot = false;
    this.invulnerabilityTimer = 0;
    this.isPressingRise = false;
    this.active = true;
  }

  update(delta, worldHeight) {
    const acceleration = this.isPressingRise ? this.riseAcceleration : this.fallAcceleration;
    this.velocityY += acceleration * delta;

    if (this.isPressingRise) {
      this.velocityY = Math.max(this.velocityY, this.maxRiseSpeed);
    } else {
      this.velocityY = Math.min(this.velocityY, this.maxFallSpeed);
    }

    this.y += this.velocityY * delta;
    this.y = Math.max(this.height * 0.6, Math.min(worldHeight - this.height * 0.6, this.y));

    if ((this.y <= this.height * 0.6 && this.velocityY < 0) || (this.y >= worldHeight - this.height * 0.6 && this.velocityY > 0)) {
      this.velocityY = 0;
    }

    this.fireTimer -= delta;
    this.invulnerabilityTimer = Math.max(0, this.invulnerabilityTimer - delta);
  }

  canShoot() {
    return this.fireTimer <= 0 && this.active;
  }

  shoot() {
    this.fireTimer = this.fireCooldown;
    const bulletX = this.x + this.width * 0.45;
    const bulletOffsets = this.hasDoubleShot
      ? this.classConfig.doubleShotOffsets
      : [this.classConfig.singleShotOffset];

    return bulletOffsets.map((offsetY) => new Bullet({
      x: bulletX,
      y: this.y + offsetY,
      velocityX: this.classConfig.bulletSpeed,
      radius: this.classConfig.bulletRadius,
      damage: this.classConfig.bulletDamage,
      ownerId: this.id,
    }));
  }

  takeDamage(amount) {
    if (this.invulnerabilityTimer > 0 || !this.active) {
      return false;
    }
    this.health = Math.max(0, this.health - amount);
    this.invulnerabilityTimer = this.invulnerabilityDuration;
    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  heal(amount) {
    if (!this.active || this.health >= this.maxHealth) {
      return 0;
    }

    const previousHealth = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this.health - previousHealth;
  }

  enableDoubleShot() {
    if (!this.active || this.hasDoubleShot) {
      return false;
    }

    this.hasDoubleShot = true;
    return true;
  }

  draw(ctx, assets) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.invulnerabilityTimer > 0) {
      ctx.globalAlpha = 0.6 + Math.sin(this.invulnerabilityTimer * 28) * 0.25;
    }
    const classImage = assets?.[this.classConfig.spriteKey];
    if (classImage) {
      ctx.drawImage(
        classImage,
        this.width * this.classConfig.renderOffsetX,
        this.height * this.classConfig.renderOffsetY,
        this.width * this.classConfig.renderScaleX,
        this.height * this.classConfig.renderScaleY,
      );
    } else if (assets?.atlasImage) {
      const sprite = assets.spriteMap.player;
      ctx.drawImage(
        assets.atlasImage,
        sprite.sx,
        sprite.sy,
        sprite.sw,
        sprite.sh,
        this.width * this.classConfig.renderOffsetX,
        this.height * this.classConfig.renderOffsetY,
        this.width * this.classConfig.renderScaleX,
        this.height * this.classConfig.renderScaleY,
      );
    } else {
      ctx.fillStyle = "#fb923c";
      ctx.beginPath();
      ctx.ellipse(0, 0, this.width * 0.34, this.height * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

window.Player = Player;
