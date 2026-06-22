class Player {
  constructor({
    id,
    x,
    y,
    canvasHeight,
    controls = { riseKey: "Space" },
    maxHealth = 100,
  }) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.canvasHeight = canvasHeight;
    this.controls = controls;
    this.width = 96;
    this.height = 54;
    this.velocityY = 0;
    this.riseAcceleration = -980;
    this.fallAcceleration = 720;
    this.maxRiseSpeed = -260;
    this.maxFallSpeed = 320;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.fireCooldown = 0.22;
    this.fireTimer = 0;
    this.invulnerabilityDuration = 0.7;
    this.invulnerabilityTimer = 0;
    this.isPressingRise = false;
    this.active = true;
  }

  reset(y) {
    this.y = y;
    this.velocityY = 0;
    this.health = this.maxHealth;
    this.fireTimer = 0;
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
    return new Bullet({
      x: this.x + this.width * 0.45,
      y: this.y + 2,
      velocityX: 460,
      radius: 5,
      damage: 1,
      ownerId: this.id,
    });
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

  draw(ctx, assets) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.invulnerabilityTimer > 0) {
      ctx.globalAlpha = 0.6 + Math.sin(this.invulnerabilityTimer * 28) * 0.25;
    }
    if (assets?.atlasImage) {
      const sprite = assets.spriteMap.player;
      ctx.drawImage(
        assets.atlasImage,
        sprite.sx,
        sprite.sy,
        sprite.sw,
        sprite.sh,
        -this.width * 0.62,
        -this.height * 0.65,
        this.width * 1.24,
        this.height * 1.3,
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
