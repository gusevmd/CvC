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
    this.metaUpgrades = {
      healthLevel: 0,
      fireRateLevel: 0,
      speedLevel: 0,
    };
    this.width = 84;
    this.height = 48;
    this.baseX = x;
    this.velocityY = 0;
    this.velocityX = 0;
    this.riseAcceleration = this.classConfig.riseAcceleration;
    this.fallAcceleration = this.classConfig.fallAcceleration;
    this.maxRiseSpeed = this.classConfig.maxRiseSpeed;
    this.maxFallSpeed = this.classConfig.maxFallSpeed;
    this.moveAcceleration = 880;
    this.maxHorizontalSpeed = 280;
    this.maxVerticalSpeed = 320;
    this.horizontalDrag = 0.88;
    this.verticalDrag = 0.9;
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
    this.maxHealth = this.classConfig.maxHealth + this.metaUpgrades.healthLevel * 10;
    this.fireCooldown = Math.max(0.12, this.classConfig.fireCooldown - this.metaUpgrades.fireRateLevel * 0.015);
    this.moveAcceleration = 880 + this.metaUpgrades.speedLevel * 70;
    this.maxHorizontalSpeed = 280 + this.metaUpgrades.speedLevel * 22;
    this.maxVerticalSpeed = 320 + this.metaUpgrades.speedLevel * 22;
    this.invulnerabilityDuration = this.classConfig.invulnerabilityDuration;
    this.health = Math.min(this.health, this.maxHealth);
  }

  setMetaUpgrades(metaUpgrades) {
    this.metaUpgrades = {
      healthLevel: metaUpgrades.healthLevel || 0,
      fireRateLevel: metaUpgrades.fireRateLevel || 0,
      speedLevel: metaUpgrades.speedLevel || 0,
    };
    this.applyClass(this.classId);
  }

  reset(y) {
    this.x = this.baseX;
    this.y = y;
    this.velocityX = 0;
    this.velocityY = 0;
    this.applyClass(this.classId);
    this.health = this.maxHealth;
    this.fireTimer = 0;
    this.hasDoubleShot = false;
    this.invulnerabilityTimer = 0;
    this.isPressingRise = false;
    this.active = true;
  }

  update(delta, worldWidth, worldHeight, inputVector = { x: 0, y: 0 }) {
    const inputX = Math.max(-1, Math.min(1, inputVector.x || 0));
    const inputY = Math.max(-1, Math.min(1, inputVector.y || 0));

    this.velocityX += inputX * this.moveAcceleration * delta;
    this.velocityY += inputY * this.moveAcceleration * delta;

    if (inputX === 0) {
      this.velocityX *= Math.pow(this.horizontalDrag, delta * 60);
    }
    if (inputY === 0) {
      this.velocityY *= Math.pow(this.verticalDrag, delta * 60);
    }

    this.velocityX = Math.max(-this.maxHorizontalSpeed, Math.min(this.maxHorizontalSpeed, this.velocityX));
    this.velocityY = Math.max(-this.maxVerticalSpeed, Math.min(this.maxVerticalSpeed, this.velocityY));

    this.x += this.velocityX * delta;
    this.y += this.velocityY * delta;

    const minX = this.width * 0.8;
    const maxX = worldWidth * 0.42;
    const minY = this.height * 0.6;
    const maxY = worldHeight - this.height * 0.6;

    this.x = Math.max(minX, Math.min(maxX, this.x));
    this.y = Math.max(minY, Math.min(maxY, this.y));

    if ((this.x <= minX && this.velocityX < 0) || (this.x >= maxX && this.velocityX > 0)) {
      this.velocityX = 0;
    }
    if ((this.y <= minY && this.velocityY < 0) || (this.y >= maxY && this.velocityY > 0)) {
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
      explosionRadius: this.classConfig.explosionRadius || 0,
      isRocket: this.classConfig.weaponType === "rocket",
      tint: this.classConfig.weaponType === "rocket" ? (this.classConfig.rocketTint || "#fb923c") : null,
      glow: this.classConfig.weaponType === "rocket" ? "rgba(251, 146, 60, 0.8)" : null,
      spriteScale: this.classConfig.weaponType === "rocket" ? 1.14 : 1,
      elongated: this.classConfig.weaponType === "rocket",
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
