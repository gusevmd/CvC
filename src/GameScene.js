function circleRectOverlap(circle, rect) {
  const closestX = Math.max(rect.x - rect.width / 2, Math.min(circle.x, rect.x + rect.width / 2));
  const closestY = Math.max(rect.y - rect.height / 2, Math.min(circle.y, rect.y + rect.height / 2));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function rectOverlap(a, b) {
  return (
    Math.abs(a.x - b.x) * 2 < a.width + b.width &&
    Math.abs(a.y - b.y) * 2 < a.height + b.height
  );
}

class GameScene {
  constructor({ canvas, ui, assets }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;
    this.assets = assets;

    this.players = [
      new Player({
        id: "player-1",
        x: 156,
        y: canvas.height / 2,
        canvasHeight: canvas.height,
        controls: { riseKey: "Space", pointer: true, touch: true },
        classId: window.PlayerClasses.defaultId,
      }),
    ];

    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.obstacles = [];
    this.healingPickups = [];
    this.upgradePickups = [];
    this.effects = [];
    this.bubbles = this.createBubbles(18);
    this.background = {
      farOffset: 0,
      midOffset: 0,
      nearOffset: 0,
      floorOffset: 0,
    };

    this.state = "start";
    this.selectedClassId = window.PlayerClasses.defaultId;
    this.score = 0;
    this.survivalScoreAccumulator = 0;
    this.elapsed = 0;
    this.lastTime = 0;

    this.spawnTimers = {
      enemy: 1.4,
      obstacle: 1.1,
      healing: 7,
      upgrade: 14,
    };

    this.input = {
      pointerHeld: false,
      keysHeld: new Set(),
    };

    this.bindInput();
    this.updateHud();
  }

  bindInput() {
    window.addEventListener("keydown", (event) => {
      if (event.code === "Space") {
        event.preventDefault();
      }
      this.input.keysHeld.add(event.code);
      if (this.state === "start" && event.code === "Space") {
        this.startGame();
      }
    });

    window.addEventListener("keyup", (event) => {
      this.input.keysHeld.delete(event.code);
    });

    const holdPointer = (event) => {
      event.preventDefault();
      this.input.pointerHeld = true;
      if (this.state === "start") {
        this.startGame();
      }
    };

    const releasePointer = () => {
      this.input.pointerHeld = false;
    };

    this.canvas.addEventListener("mousedown", holdPointer);
    window.addEventListener("mouseup", releasePointer);
    this.canvas.addEventListener("touchstart", holdPointer, { passive: false });
    window.addEventListener("touchend", releasePointer, { passive: true });
    window.addEventListener("touchcancel", releasePointer, { passive: true });
  }

  start() {
    requestAnimationFrame((time) => this.loop(time));
  }

  startGame() {
    this.players.forEach((player) => player.applyClass(this.selectedClassId));
    this.resetWorld();
    this.state = "running";
    this.ui.startOverlay.hidden = true;
    this.ui.gameOverOverlay.hidden = true;
  }

  setSelectedClass(classId) {
    this.selectedClassId = window.PlayerClasses.getConfig(classId).id;
  }

  resetWorld() {
    this.score = 0;
    this.survivalScoreAccumulator = 0;
    this.elapsed = 0;
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.obstacles = [];
    this.healingPickups = [];
    this.upgradePickups = [];
    this.effects = [];
    this.spawnTimers.enemy = 1.4;
    this.spawnTimers.obstacle = 1.1;
    this.spawnTimers.healing = 7;
    this.spawnTimers.upgrade = 14;
    this.players.forEach((player, index) => {
      player.reset(this.canvas.height * (0.36 + index * 0.16));
    });
    this.updateHud();
  }

  gameOver() {
    this.state = "gameover";
    this.ui.gameOverOverlay.hidden = false;
    this.ui.gameOverScore.textContent = `Финальный счёт: ${Math.floor(this.score)}`;
  }

  loop(time) {
    const delta = Math.min(0.033, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;

    this.update(delta);
    this.render();

    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  update(delta) {
    this.updateBubbles(delta);
    this.updateBackground(delta);

    if (this.state !== "running") {
      return;
    }

    this.elapsed += delta;
    this.survivalScoreAccumulator += delta * 8;
    if (this.survivalScoreAccumulator >= 1) {
      const points = Math.floor(this.survivalScoreAccumulator);
      this.score += points;
      this.survivalScoreAccumulator -= points;
    }

    const difficulty = 1 + Math.min(this.elapsed / 50, 1.8);
    const riseActive = this.input.pointerHeld || this.input.keysHeld.has("Space");

    this.players.forEach((player) => {
      player.isPressingRise = riseActive;
      player.update(delta, this.canvas.height);
      if (player.canShoot()) {
        this.bullets.push(...player.shoot());
      }
    });

    this.spawnTimers.enemy -= delta;
    this.spawnTimers.obstacle -= delta;
    this.spawnTimers.healing -= delta;
    this.spawnTimers.upgrade -= delta;

    if (this.spawnTimers.enemy <= 0) {
      this.spawnEnemy(difficulty);
      this.spawnTimers.enemy = Math.max(0.45, 1.55 - difficulty * 0.25 + Math.random() * 0.35);
    }

    if (this.spawnTimers.obstacle <= 0) {
      this.spawnObstacle(difficulty);
      this.spawnTimers.obstacle = Math.max(0.35, 1.25 - difficulty * 0.18 + Math.random() * 0.4);
    }

    if (this.spawnTimers.healing <= 0) {
      this.spawnHealingPickup();
      this.spawnTimers.healing = 10 + Math.random() * 6;
    }

    if (this.spawnTimers.upgrade <= 0) {
      this.spawnUpgradePickup();
      this.spawnTimers.upgrade = 18 + Math.random() * 8;
    }

    this.bullets.forEach((bullet) => bullet.update(delta, this.canvas.width));
    this.enemyBullets.forEach((bullet) => bullet.update(delta, this.canvas.width));
    this.enemies.forEach((enemy) => {
      enemy.update(delta);
      if (enemy.canShoot()) {
        this.enemyBullets.push(enemy.shoot());
      }
    });
    this.obstacles.forEach((obstacle) => obstacle.update(delta));
    this.healingPickups.forEach((pickup) => pickup.update(delta));
    this.upgradePickups.forEach((pickup) => pickup.update(delta));
    this.effects.forEach((effect) => effect.update(delta));

    this.resolveBulletHits();
    this.resolvePlayerCollisions();
    this.cleanup();
    this.updateHud();

    if (this.players.every((player) => !player.active)) {
      this.gameOver();
    }
  }

  spawnEnemy(difficulty) {
    const spawnShooter = this.elapsed > 12 && Math.random() < Math.min(0.16 + difficulty * 0.05, 0.38);
    const scale = spawnShooter ? 0.92 + Math.random() * 0.3 : 0.8 + Math.random() * 0.8;
    const health = spawnShooter ? 3 : (scale > 1.2 ? 4 : 3);
    const speed = spawnShooter
      ? 138 + difficulty * 22 + Math.random() * 36
      : 190 + difficulty * 36 + Math.random() * 80;
    this.enemies.push(
      new Enemy({
        x: this.canvas.width + 80,
        y: 88 + Math.random() * (this.canvas.height - 176),
        speed,
        scale,
        health,
        kind: spawnShooter ? "shooter" : "swimmer",
        damage: spawnShooter ? 14 : 16 + Math.round(scale * 4),
        fireCooldown: Math.max(1.15, 1.85 - difficulty * 0.14 + Math.random() * 0.25),
        bulletSpeed: -(255 + difficulty * 16 + Math.random() * 24),
        bulletDamage: 10 + Math.round(difficulty * 2),
        scoreValue: spawnShooter ? 38 + Math.round(difficulty * 9) : 28 + Math.round(scale * 12),
      }),
    );
  }

  spawnObstacle(difficulty) {
    const patterns = [
      { kind: "boot", destructible: true, health: 2, scale: 0.9 + Math.random() * 0.6, scoreValue: 18 },
      { kind: "hook", destructible: false, health: 999, scale: 0.9 + Math.random() * 0.5, scoreValue: 0 },
    ];
    const config = patterns[Math.floor(Math.random() * patterns.length)];
    this.obstacles.push(
      new Obstacle({
        x: this.canvas.width + 60,
        y: 84 + Math.random() * (this.canvas.height - 168),
        speed: 170 + difficulty * 28 + Math.random() * 70,
        kind: config.kind,
        destructible: config.destructible,
        scale: config.scale,
        health: config.health,
        damage: config.destructible ? 10 : 18,
        scoreValue: config.scoreValue,
      }),
    );
  }

  spawnHealingPickup() {
    this.healingPickups.push(
      new HealingPickup({
        x: this.canvas.width + 70,
        y: 96 + Math.random() * (this.canvas.height - 192),
        speed: 105 + Math.random() * 35,
        healAmount: 25,
      }),
    );
  }

  spawnUpgradePickup() {
    this.upgradePickups.push(
      new UpgradePickup({
        x: this.canvas.width + 74,
        y: 102 + Math.random() * (this.canvas.height - 204),
        speed: 110 + Math.random() * 30,
      }),
    );
  }

  resolveBulletHits() {
    for (const bullet of this.bullets) {
      if (!bullet.active) {
        continue;
      }

      let hit = false;
      for (const enemy of this.enemies) {
        if (!enemy.active) {
          continue;
        }
        if (circleRectOverlap(bullet, enemy)) {
          bullet.active = false;
          hit = true;
          const destroyed = enemy.takeDamage(bullet.damage);
          if (destroyed) {
            this.score += enemy.scoreValue;
            this.effects.push(new ExplosionEffect({ x: enemy.x, y: enemy.y, scale: enemy.scale }));
          }
          break;
        }
      }

      if (hit) {
        continue;
      }

      for (const obstacle of this.obstacles) {
        if (!obstacle.active) {
          continue;
        }
        if (circleRectOverlap(bullet, obstacle)) {
          bullet.active = false;
          const destroyed = obstacle.takeDamage(bullet.damage);
          if (destroyed) {
            this.score += obstacle.scoreValue;
            this.effects.push(new ExplosionEffect({ x: obstacle.x, y: obstacle.y, scale: obstacle.scale * 0.75 }));
          }
          break;
        }
      }
    }
  }

  resolvePlayerCollisions() {
    for (const player of this.players) {
      if (!player.active) {
        continue;
      }

      for (const enemy of this.enemies) {
        if (enemy.active && rectOverlap(player, enemy)) {
          enemy.active = false;
          player.takeDamage(enemy.damage);
          this.effects.push(new ExplosionEffect({ x: enemy.x, y: enemy.y, scale: enemy.scale }));
        }
      }

      for (const obstacle of this.obstacles) {
        if (obstacle.active && rectOverlap(player, obstacle)) {
          obstacle.active = false;
          player.takeDamage(obstacle.damage);
          this.effects.push(new ExplosionEffect({ x: obstacle.x, y: obstacle.y, scale: obstacle.scale * 0.8 }));
        }
      }

      for (const bullet of this.enemyBullets) {
        if (!bullet.active || !circleRectOverlap(bullet, player)) {
          continue;
        }

        bullet.active = false;
        player.takeDamage(bullet.damage);
      }

      for (const pickup of this.healingPickups) {
        if (!pickup.active || !rectOverlap(player, pickup)) {
          continue;
        }

        const healedAmount = player.heal(pickup.healAmount);
        if (healedAmount > 0) {
          pickup.active = false;
          this.effects.push(new HealingEffect({ x: player.x, y: player.y - 38, amount: healedAmount }));
        }
      }

      for (const pickup of this.upgradePickups) {
        if (!pickup.active || !rectOverlap(player, pickup)) {
          continue;
        }

        const upgraded = player.enableDoubleShot();
        if (upgraded) {
          pickup.active = false;
        }
      }
    }
  }

  cleanup() {
    this.bullets = this.bullets.filter((bullet) => bullet.active);
    this.enemyBullets = this.enemyBullets.filter((bullet) => bullet.active);
    this.enemies = this.enemies.filter((enemy) => enemy.active);
    this.obstacles = this.obstacles.filter((obstacle) => obstacle.active);
    this.healingPickups = this.healingPickups.filter((pickup) => pickup.active);
    this.upgradePickups = this.upgradePickups.filter((pickup) => pickup.active);
    this.effects = this.effects.filter((effect) => effect.active);
  }

  createBubbles(count) {
    return Array.from({ length: count }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      radius: 5 + Math.random() * 14,
      speed: 16 + Math.random() * 42,
      drift: -10 + Math.random() * 20,
    }));
  }

  updateBubbles(delta) {
    for (const bubble of this.bubbles) {
      bubble.y -= bubble.speed * delta;
      bubble.x += bubble.drift * delta;
      if (bubble.y < -20) {
        bubble.y = this.canvas.height + 20;
        bubble.x = Math.random() * this.canvas.width;
      }
      if (bubble.x < -20) {
        bubble.x = this.canvas.width + 20;
      } else if (bubble.x > this.canvas.width + 20) {
        bubble.x = -20;
      }
    }
  }

  updateBackground(delta) {
    this.background.farOffset = (this.background.farOffset + delta * 16) % this.canvas.width;
    this.background.midOffset = (this.background.midOffset + delta * 34) % this.canvas.width;
    this.background.nearOffset = (this.background.nearOffset + delta * 62) % this.canvas.width;
    this.background.floorOffset = (this.background.floorOffset + delta * 82) % this.canvas.width;
  }

  updateHud() {
    const leadPlayer = this.players[0];
    const health = Math.max(0, leadPlayer?.health ?? 0);
    const maxHealth = leadPlayer?.maxHealth ?? 100;
    const ratio = health / maxHealth;
    this.ui.scoreValue.textContent = Math.floor(this.score);
    this.ui.healthFill.style.transform = `scaleX(${ratio})`;
    this.ui.healthLabel.textContent = `${Math.ceil(health)} / ${maxHealth}`;
  }

  render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.renderBackground(ctx, canvas);

    this.players.forEach((player) => player.draw(ctx, this.assets));
    this.enemies.forEach((enemy) => enemy.draw(ctx, this.assets));
    this.obstacles.forEach((obstacle) => obstacle.draw(ctx, this.assets));
    this.healingPickups.forEach((pickup) => pickup.draw(ctx, this.assets));
    this.upgradePickups.forEach((pickup) => pickup.draw(ctx, this.assets));
    this.bullets.forEach((bullet) => bullet.draw(ctx, this.assets));
    this.enemyBullets.forEach((bullet) => bullet.draw(ctx, this.assets));
    this.effects.forEach((effect) => effect.draw(ctx, this.assets));

    if (this.state === "start") {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "bold 20px Trebuchet MS";
      ctx.fillText("Карась уже заряжает пушку...", 26, canvas.height - 26);
    }
  }

  renderBackground(ctx, canvas) {
    const water = ctx.createLinearGradient(0, 0, 0, canvas.height);
    water.addColorStop(0, "#8be9fd");
    water.addColorStop(0.56, "#0ea5e9");
    water.addColorStop(1, "#0c4a6e");
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = -1; i < 8; i += 1) {
      const x = i * 160 - this.background.farOffset;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.ellipse(x, 120, 50, 320, 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = -1; i < 7; i += 1) {
      const x = i * 180 - this.background.floorOffset;
      ctx.fillStyle = "rgba(15, 118, 110, 0.32)";
      ctx.beginPath();
      ctx.ellipse(x, canvas.height - 26, 78, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(20, 184, 166, 0.18)";
      ctx.beginPath();
      ctx.ellipse(x + 18, canvas.height - 36, 42, 10, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = -1; i < 6; i += 1) {
      const x = i * 220 - this.background.midOffset;
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.beginPath();
      ctx.arc(x, 160 + Math.sin((i + this.elapsed) * 0.8) * 18, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 28, 208 + Math.cos((i + this.elapsed) * 0.9) * 16, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (const bubble of this.bubbles) {
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
  }
}

window.GameScene = GameScene;
