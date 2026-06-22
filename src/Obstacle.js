class Obstacle {
  constructor({
    x,
    y,
    speed,
    kind = "boot",
    destructible = true,
    scale = 1,
    health = 2,
    damage = 12,
    scoreValue = 20,
  }) {
    this.type = "obstacle";
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.kind = kind;
    this.destructible = destructible;
    this.scale = scale;
    this.health = health;
    this.damage = damage;
    this.scoreValue = scoreValue;
    this.width = (kind === "hook" ? 32 : kind === "chest" ? 54 : 66) * scale;
    this.height = (kind === "hook" ? 62 : kind === "chest" ? 48 : 44) * scale;
    this.active = true;
  }

  update(delta) {
    this.x -= this.speed * delta;
    if (this.x + this.width < -48) {
      this.active = false;
    }
  }

  takeDamage(amount) {
    if (!this.destructible) {
      return false;
    }
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
    if (this.kind === "chest" && assets?.chestImage) {
      ctx.drawImage(
        assets.chestImage,
        -this.width * 0.72,
        -this.height * 0.76,
        this.width * 1.44,
        this.height * 1.52,
      );
    } else if (assets?.atlasImage) {
      const sprite = assets.spriteMap[this.kind];
      ctx.drawImage(
        assets.atlasImage,
        sprite.sx,
        sprite.sy,
        sprite.sw,
        sprite.sh,
        -this.width * 0.6,
        -this.height * 0.6,
        this.width * 1.2,
        this.height * 1.2,
      );
    } else {
      ctx.fillStyle = "#7c2d12";
      ctx.strokeStyle = "#431407";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-this.width * 0.28, -this.height * 0.28);
      ctx.lineTo(this.width * 0.08, -this.height * 0.28);
      ctx.lineTo(this.width * 0.16, -this.height * 0.04);
      ctx.lineTo(this.width * 0.28, this.height * 0.34);
      ctx.lineTo(-this.width * 0.08, this.height * 0.34);
      ctx.lineTo(-this.width * 0.18, this.height * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#caa472";
      ctx.lineWidth = 2;
      for (let i = -1; i < 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-this.width * 0.04 + i * 6, this.height * 0.02);
        ctx.lineTo(this.width * 0.14 + i * 6, this.height * 0.22);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

window.Obstacle = Obstacle;
