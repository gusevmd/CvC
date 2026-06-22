class ExplosionEffect {
  constructor({ x, y, duration = 0.38, scale = 1 }) {
    this.x = x;
    this.y = y;
    this.duration = duration;
    this.life = duration;
    this.scale = scale;
    this.active = true;
  }

  update(delta) {
    this.life -= delta;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx, assets) {
    const progress = 1 - this.life / this.duration;
    const alpha = Math.max(0, 1 - progress);
    const size = 58 + progress * 82 * this.scale;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgba(255, 200, 50, ${alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 120, 20, ${alpha * 0.85})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 0.24, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

window.ExplosionEffect = ExplosionEffect;

class HitEffect {
  constructor({ x, y, duration = 0.14, scale = 1, direction = 1, color = "#fde047" }) {
    this.x = x;
    this.y = y;
    this.duration = duration;
    this.life = duration;
    this.scale = scale;
    this.direction = direction;
    this.color = color;
    this.active = true;
  }

  update(delta) {
    this.life -= delta;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    const progress = 1 - this.life / this.duration;
    const alpha = Math.max(0, 1 - progress);
    const burst = (12 + progress * 18) * this.scale;

    ctx.save();
    ctx.translate(this.x + progress * 8 * this.direction, this.y);
    ctx.globalAlpha = alpha;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1.5, 4 * alpha);
    ctx.lineCap = "round";

    for (let i = -1; i <= 1; i += 1) {
      const angle = i * 0.5;
      const x1 = Math.cos(angle) * burst * 0.2;
      const y1 = Math.sin(angle) * burst * 0.4;
      const x2 = Math.cos(angle) * burst;
      const y2 = Math.sin(angle) * burst;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
    ctx.beginPath();
    ctx.arc(0, 0, burst * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

window.HitEffect = HitEffect;

class HealingEffect {
  constructor({ x, y, amount, duration = 0.8 }) {
    this.x = x;
    this.y = y;
    this.amount = amount;
    this.duration = duration;
    this.life = duration;
    this.active = true;
  }

  update(delta) {
    this.life -= delta;
    this.y -= delta * 28;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    const progress = 1 - this.life / this.duration;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.fillStyle = "#86efac";
    ctx.strokeStyle = "rgba(6, 78, 59, 0.8)";
    ctx.lineWidth = 4;
    ctx.font = "bold 25px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.strokeText(`+${Math.ceil(this.amount)} HP`, this.x, this.y);
    ctx.fillText(`+${Math.ceil(this.amount)} HP`, this.x, this.y);
    ctx.restore();
  }
}

window.HealingEffect = HealingEffect;
