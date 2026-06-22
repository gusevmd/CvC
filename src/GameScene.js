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

function circleOverlap(a, b, radius) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy <= radius * radius;
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
    this.coinPickups = [];
    this.boss = null;
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
    this.selectedMode = "campaign";
    this.score = 0;
    this.coins = 0;
    this.wallet = 0;
    this.survivalScoreAccumulator = 0;
    this.elapsed = 0;
    this.lastTime = 0;

    this.spawnTimers = {
      enemy: 1.4,
      obstacle: 1.1,
      healing: 7,
      upgrade: 14,
    };
    this.campaignStages = [
      {
        id: "warmup",
        title: "Разогрев",
        duration: 18,
        enemyWeights: { swimmer: 1 },
        maxEnemies: 3,
        maxShooters: 0,
        maxGrunts: 0,
        maxBazookas: 0,
        maxObstacles: 1,
        allowObstacles: true,
        chestChance: 0,
      },
      {
        id: "crossfire",
        title: "Перекрёстный огонь",
        duration: 20,
        enemyWeights: { swimmer: 0.6, shooter: 0.4 },
        maxEnemies: 4,
        maxShooters: 1,
        maxGrunts: 0,
        maxBazookas: 0,
        maxObstacles: 1,
        allowObstacles: true,
        chestChance: 0.08,
      },
      {
        id: "gunline",
        title: "Пулемётная линия",
        duration: 20,
        enemyWeights: { swimmer: 0.4, shooter: 0.25, grunt: 0.35 },
        maxEnemies: 4,
        maxShooters: 1,
        maxGrunts: 1,
        maxBazookas: 0,
        maxObstacles: 2,
        allowObstacles: true,
        chestChance: 0.14,
      },
      {
        id: "demolition",
        title: "Подрывники",
        duration: 18,
        enemyWeights: { swimmer: 0.25, shooter: 0.2, grunt: 0.25, bazooka: 0.3 },
        maxEnemies: 4,
        maxShooters: 1,
        maxGrunts: 1,
        maxBazookas: 1,
        maxObstacles: 1,
        allowObstacles: true,
        chestChance: 0.18,
      },
      {
        id: "preboss",
        title: "Перед Штурмом",
        duration: 10,
        enemyWeights: { swimmer: 0.6, shooter: 0.4 },
        maxEnemies: 2,
        maxShooters: 1,
        maxGrunts: 0,
        maxBazookas: 0,
        maxObstacles: 0,
        allowObstacles: false,
        chestChance: 0,
      },
    ];
    this.campaignBossTime = this.campaignStages.reduce((sum, stage) => sum + stage.duration, 0);
    this.bossLootTimer = 0;
    this.chestSpawnedThisRun = false;
    this.rewardGranted = false;
    this.bossBandageDropped = false;
    this.currentCampaignStageId = this.campaignStages[0].id;
    this.stageBannerText = this.campaignStages[0].title;
    this.stageBannerTimer = 2.4;
    this.metaUpgrades = {
      healthLevel: 0,
      fireRateLevel: 0,
      magnetLevel: 0,
      speedLevel: 0,
    };
    this.shopConfig = {
      health: { costBase: 12, costStep: 8 },
      fireRate: { costBase: 14, costStep: 10 },
      magnet: { costBase: 10, costStep: 7 },
      speed: { costBase: 11, costStep: 8 },
    };

    this.input = {
      pointerHeld: false,
      pointerX: canvas.width * 0.2,
      pointerY: canvas.height * 0.5,
      keysHeld: new Set(),
    };

    this.bindInput();
    this.bindShop();
    this.updateHud();
    this.updateShopUi();
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

    const updatePointerPosition = (event) => {
      const source = event.touches?.[0] || event.changedTouches?.[0] || event;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.input.pointerX = (source.clientX - rect.left) * scaleX;
      this.input.pointerY = (source.clientY - rect.top) * scaleY;
    };

    const holdPointer = (event) => {
      event.preventDefault();
      updatePointerPosition(event);
      this.input.pointerHeld = true;
      if (this.state === "start") {
        this.startGame();
      }
    };

    const releasePointer = () => {
      this.input.pointerHeld = false;
    };

    const movePointer = (event) => {
      if (!this.input.pointerHeld) {
        return;
      }
      updatePointerPosition(event);
    };

    this.canvas.addEventListener("mousedown", holdPointer);
    this.canvas.addEventListener("mousemove", movePointer);
    window.addEventListener("mouseup", releasePointer);
    this.canvas.addEventListener("touchstart", holdPointer, { passive: false });
    this.canvas.addEventListener("touchmove", movePointer, { passive: false });
    window.addEventListener("touchend", releasePointer, { passive: true });
    window.addEventListener("touchcancel", releasePointer, { passive: true });
  }

  start() {
    requestAnimationFrame((time) => this.loop(time));
  }

  startGame() {
    this.players.forEach((player) => {
      player.setMetaUpgrades(this.metaUpgrades);
      player.applyClass(this.selectedClassId);
    });
    this.resetWorld();
    this.state = "running";
    this.ui.startOverlay.hidden = true;
    this.ui.gameOverOverlay.hidden = true;
  }

  setSelectedClass(classId) {
    this.selectedClassId = window.PlayerClasses.getConfig(classId).id;
  }

  setSelectedMode(mode) {
    this.selectedMode = mode === "endless" ? "endless" : "campaign";
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
    this.coinPickups = [];
    this.boss = null;
    this.effects = [];
    this.coins = 0;
    this.bossLootTimer = 0;
    this.chestSpawnedThisRun = false;
    this.rewardGranted = false;
    this.bossBandageDropped = false;
    this.currentCampaignStageId = this.campaignStages[0].id;
    this.stageBannerText = this.campaignStages[0].title;
    this.stageBannerTimer = this.selectedMode === "campaign" ? 2.4 : 0;
    this.spawnTimers.enemy = 1.4;
    this.spawnTimers.obstacle = 1.1;
    this.spawnTimers.healing = 7;
    this.spawnTimers.upgrade = 14;
    this.players.forEach((player, index) => {
      player.setMetaUpgrades(this.metaUpgrades);
      player.reset(this.canvas.height * (0.36 + index * 0.16));
    });
    this.updateHud();
    this.updateShopUi();
  }

  gameOver() {
    this.finishRunRewards();
    this.state = "gameover";
    this.ui.gameOverOverlay.hidden = false;
    this.ui.gameOverTitle.textContent = "Карась выбыл";
    this.ui.gameOverScore.textContent = `Финальный счёт: ${Math.floor(this.score)}`;
    this.ui.restartButton.textContent = "Повторить";
    this.updateShopUi();
  }

  victory() {
    this.finishRunRewards();
    this.state = "victory";
    this.ui.gameOverOverlay.hidden = false;
    this.ui.gameOverTitle.textContent = "Босс побеждён";
    this.ui.gameOverScore.textContent = `Счёт: ${Math.floor(this.score)} · Монеты: ${this.coins}`;
    this.ui.restartButton.textContent = "Играть снова";
    this.updateShopUi();
  }

  loop(time) {
    const delta = Math.min(0.033, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;

    this.update(delta);
    this.render();

    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  update(delta) {
    const worldFrozen = Boolean(this.boss) || this.state === "bossclear";
    if (!worldFrozen) {
      this.updateBubbles(delta);
      this.updateBackground(delta);
    }

    if (this.state !== "running" && this.state !== "bossclear") {
      return;
    }

    this.elapsed += delta;
    this.stageBannerTimer = Math.max(0, this.stageBannerTimer - delta);
    this.survivalScoreAccumulator += delta * (this.selectedMode === "endless" ? 8 : this.boss ? 0 : 8);
    if (this.survivalScoreAccumulator >= 1) {
      const points = Math.floor(this.survivalScoreAccumulator);
      this.score += points;
      this.survivalScoreAccumulator -= points;
    }

    const difficulty = 1 + Math.min(this.elapsed / 50, 1.8);
    const movement = this.getMovementInput();
    this.updateCampaignStage();

    this.players.forEach((player) => {
      player.update(delta, this.canvas.width, this.canvas.height, movement);
      if (player.canShoot()) {
        this.bullets.push(...player.shoot());
      }
    });

    const shouldRunStage = this.state === "running" && !this.boss;

    if (shouldRunStage) {
      this.spawnTimers.enemy -= delta;
      this.spawnTimers.obstacle -= delta;
      this.spawnTimers.healing -= delta;
      this.spawnTimers.upgrade -= delta;

      if (this.selectedMode === "campaign" && this.elapsed >= this.campaignBossTime) {
        this.startBossEncounter();
      } else {
        if (this.spawnTimers.enemy <= 0) {
          this.spawnEnemy(difficulty);
          const stage = this.getCurrentStageConfig();
          const stageBias = this.selectedMode === "campaign" && stage
            ? Math.max(0.52, 1.1 - (stage.maxEnemies - 2) * 0.12)
            : 1;
          this.spawnTimers.enemy = Math.max(0.45, (1.55 - difficulty * 0.25 + Math.random() * 0.35) * stageBias);
        }

        if (this.spawnTimers.obstacle <= 0) {
          this.spawnObstacle(difficulty);
          const stage = this.getCurrentStageConfig();
          const obstacleBias = this.selectedMode === "campaign" && stage && !stage.allowObstacles
            ? 999
            : 1;
          this.spawnTimers.obstacle = Math.max(0.35, 1.25 - difficulty * 0.18 + Math.random() * 0.4) * obstacleBias;
        }

        if (this.spawnTimers.healing <= 0) {
          this.spawnHealingPickup();
          this.spawnTimers.healing = 10 + Math.random() * 6;
        }

        if (this.spawnTimers.upgrade <= 0) {
          this.spawnUpgradePickup();
          this.spawnTimers.upgrade = 18 + Math.random() * 8;
        }
      }
    }

    this.bullets.forEach((bullet) => bullet.update(delta, this.canvas.width, this.canvas.height));
    this.enemyBullets.forEach((bullet) => bullet.update(delta, this.canvas.width, this.canvas.height));
    this.enemies.forEach((enemy) => {
      const shots = enemy.update(delta, this.players[0]);
      if (shots?.length) {
        this.enemyBullets.push(...shots);
      }
    });
    if (this.boss?.active) {
      const bossShots = this.boss.update(delta, this.players[0]);
      this.enemyBullets.push(...bossShots);
      if (!this.bossBandageDropped && this.boss.secondPhase) {
        this.spawnHealingPickupAt({
          x: this.canvas.width * 0.56,
          y: this.canvas.height * 0.52,
        });
        this.bossBandageDropped = true;
      }
    }
    this.obstacles.forEach((obstacle) => obstacle.update(delta));
    this.healingPickups.forEach((pickup) => pickup.update(delta));
    this.upgradePickups.forEach((pickup) => pickup.update(delta));
    this.coinPickups.forEach((pickup) => pickup.update(delta));
    this.effects.forEach((effect) => effect.update(delta));
    this.applyCoinMagnet(delta);

    this.resolveBulletHits();
    this.resolvePlayerCollisions();
    this.cleanup();
    this.updateHud();

    if (this.state === "bossclear") {
      this.bossLootTimer -= delta;
      if (this.bossLootTimer <= 0 || this.coinPickups.length === 0) {
        this.victory();
        return;
      }
    }

    if (this.players.every((player) => !player.active)) {
      this.gameOver();
    }
  }

  startBossEncounter() {
    this.enemies = [];
    this.obstacles = [];
    this.healingPickups = [];
    this.upgradePickups = [];
    this.coinPickups = [];
    this.enemyBullets = [];
    this.bullets = [];
    this.boss = new BossEnemy({
      x: this.canvas.width + 260,
      y: this.canvas.height / 2,
      worldWidth: this.canvas.width,
      worldHeight: this.canvas.height,
    });
  }

  handleBossDefeat() {
    this.score += 420;
    this.effects.push(new ExplosionEffect({ x: this.boss.x, y: this.boss.y, scale: 2.6 }));
    this.spawnCoinPickup({
      x: this.boss.x,
      y: this.boss.y,
      amount: 24,
      spread: true,
      spreadStrength: 2.35,
    });
    this.boss = null;
    this.enemyBullets = [];
    this.state = "bossclear";
    this.bossLootTimer = 6;
  }

  getCurrentStageConfig() {
    if (this.selectedMode !== "campaign") {
      return null;
    }

    let elapsed = 0;
    for (const stage of this.campaignStages) {
      elapsed += stage.duration;
      if (this.elapsed < elapsed) {
        return stage;
      }
    }
    return this.campaignStages[this.campaignStages.length - 1];
  }

  updateCampaignStage() {
    if (this.selectedMode !== "campaign" || this.boss) {
      return;
    }

    const stage = this.getCurrentStageConfig();
    if (!stage || stage.id === this.currentCampaignStageId) {
      return;
    }

    this.currentCampaignStageId = stage.id;
    this.stageBannerText = stage.title;
    this.stageBannerTimer = 2.2;
  }

  countEnemiesByKind(kind) {
    return this.enemies.filter((enemy) => enemy.active && enemy.kind === kind).length;
  }

  bindShop() {
    this.ui.upgradeHealthButton.addEventListener("click", () => this.buyUpgrade("health"));
    this.ui.upgradeFireRateButton.addEventListener("click", () => this.buyUpgrade("fireRate"));
    this.ui.upgradeMagnetButton.addEventListener("click", () => this.buyUpgrade("magnet"));
    this.ui.upgradeSpeedButton.addEventListener("click", () => this.buyUpgrade("speed"));
  }

  getUpgradeCost(kind) {
    const config = this.shopConfig[kind];
    const level = kind === "health"
      ? this.metaUpgrades.healthLevel
      : kind === "fireRate"
        ? this.metaUpgrades.fireRateLevel
        : kind === "magnet"
          ? this.metaUpgrades.magnetLevel
          : this.metaUpgrades.speedLevel;
    return config.costBase + level * config.costStep;
  }

  buyUpgrade(kind) {
    if (this.state !== "gameover" && this.state !== "victory" && this.state !== "start") {
      return;
    }

    const cost = this.getUpgradeCost(kind);
    if (this.wallet < cost) {
      return;
    }

    this.wallet -= cost;
    if (kind === "health") {
      this.metaUpgrades.healthLevel += 1;
    } else if (kind === "fireRate") {
      this.metaUpgrades.fireRateLevel += 1;
    } else if (kind === "magnet") {
      this.metaUpgrades.magnetLevel += 1;
    } else if (kind === "speed") {
      this.metaUpgrades.speedLevel += 1;
    }

    this.players.forEach((player) => player.setMetaUpgrades(this.metaUpgrades));
    this.updateHud();
    this.updateShopUi();
  }

  finishRunRewards() {
    if (this.rewardGranted) {
      return;
    }
    this.wallet += this.coins;
    this.rewardGranted = true;
  }

  updateShopUi() {
    const healthCost = this.getUpgradeCost("health");
    const fireRateCost = this.getUpgradeCost("fireRate");
    const magnetCost = this.getUpgradeCost("magnet");
    const speedCost = this.getUpgradeCost("speed");

    this.ui.walletValue.textContent = this.wallet;
    this.ui.upgradeHealthButton.querySelector(".shop-item-title").textContent = `Живучесть Lv.${this.metaUpgrades.healthLevel}`;
    this.ui.upgradeHealthButton.querySelector(".shop-item-text").textContent = `+10 HP навсегда в этой сессии · ${healthCost} монет`;
    this.ui.upgradeHealthButton.disabled = this.wallet < healthCost;

    this.ui.upgradeFireRateButton.querySelector(".shop-item-title").textContent = `Темп Огня Lv.${this.metaUpgrades.fireRateLevel}`;
    this.ui.upgradeFireRateButton.querySelector(".shop-item-text").textContent = `Стрельба быстрее на 0.015 сек за уровень · ${fireRateCost} монет`;
    this.ui.upgradeFireRateButton.disabled = this.wallet < fireRateCost;

    this.ui.upgradeMagnetButton.querySelector(".shop-item-title").textContent = `Магнит Монет Lv.${this.metaUpgrades.magnetLevel}`;
    this.ui.upgradeMagnetButton.querySelector(".shop-item-text").textContent = `Больше радиус и сила притяжения монет · ${magnetCost} монет`;
    this.ui.upgradeMagnetButton.disabled = this.wallet < magnetCost;

    this.ui.upgradeSpeedButton.querySelector(".shop-item-title").textContent = `Скорость Lv.${this.metaUpgrades.speedLevel}`;
    this.ui.upgradeSpeedButton.querySelector(".shop-item-text").textContent = `Быстрее разгон и выше предел скорости · ${speedCost} монет`;
    this.ui.upgradeSpeedButton.disabled = this.wallet < speedCost;
  }

  applyCoinMagnet(delta) {
    const level = this.metaUpgrades.magnetLevel;
    if (level <= 0) {
      return;
    }

    const player = this.players[0];
    if (!player?.active) {
      return;
    }

    const radius = 92 + level * 42;
    const force = 180 + level * 70;

    this.coinPickups.forEach((pickup) => {
      if (!pickup.active) {
        return;
      }

      const dx = player.x - pickup.x;
      const dy = player.y - pickup.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 0.001 || distance > radius) {
        return;
      }

      pickup.x += (dx / distance) * force * delta;
      pickup.baseY += (dy / distance) * force * delta;
    });
  }

  spawnEnemy(difficulty) {
    const stage = this.getCurrentStageConfig();
    const activeEnemies = this.enemies.filter((enemy) => enemy.active);
    const activeShooters = this.countEnemiesByKind("shooter");
    const activeGrunts = this.countEnemiesByKind("grunt");
    const activeBazookas = this.countEnemiesByKind("bazooka");

    if (this.selectedMode === "campaign" && stage) {
      if (activeEnemies.length >= stage.maxEnemies) {
        return;
      }
    }

    const weights = this.selectedMode === "campaign" && stage
      ? { ...stage.enemyWeights }
      : { swimmer: 0.46, shooter: 0.26, grunt: 0.18, bazooka: 0.1 };

    if (stage) {
      if (activeShooters >= stage.maxShooters) {
        delete weights.shooter;
      }
      if (activeGrunts >= stage.maxGrunts) {
        delete weights.grunt;
      }
      if (activeBazookas >= stage.maxBazookas) {
        delete weights.bazooka;
      }
    } else {
      if (activeShooters >= 2) {
        delete weights.shooter;
      }
      if (activeGrunts >= 2) {
        delete weights.grunt;
      }
      if (activeBazookas >= 1) {
        delete weights.bazooka;
      }
    }

    const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
    if (entries.length === 0) {
      return;
    }

    const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * totalWeight;
    let enemyKind = entries[0][0];
    for (const [kind, weight] of entries) {
      roll -= weight;
      if (roll <= 0) {
        enemyKind = kind;
        break;
      }
    }

    const isShooter = enemyKind === "shooter";
    const isGrunt = enemyKind === "grunt";
    const isBazooka = enemyKind === "bazooka";
    const scale = isBazooka
      ? 0.98 + Math.random() * 0.22
      : isGrunt
        ? 0.96 + Math.random() * 0.22
        : isShooter
          ? 0.92 + Math.random() * 0.3
          : 0.8 + Math.random() * 0.8;
    const health = isBazooka ? 4 : isGrunt || isShooter ? 3 : (scale > 1.2 ? 4 : 3);
    const speed = isBazooka
      ? 128 + difficulty * 16 + Math.random() * 24
      : isGrunt
        ? 156 + difficulty * 24 + Math.random() * 42
        : isShooter
          ? 138 + difficulty * 22 + Math.random() * 36
          : 190 + difficulty * 36 + Math.random() * 80;
    this.enemies.push(
      new Enemy({
        x: this.canvas.width + 80,
        y: 88 + Math.random() * (this.canvas.height - 176),
        speed,
        scale,
        health,
        kind: enemyKind,
        damage: isBazooka ? 18 : isGrunt || isShooter ? 14 : 16 + Math.round(scale * 4),
        fireCooldown: isBazooka
          ? Math.max(1.7, 2.45 - difficulty * 0.12 + Math.random() * 0.25)
          : isGrunt
            ? Math.max(1.0, 1.45 - difficulty * 0.08 + Math.random() * 0.18)
            : Math.max(1.15, 1.85 - difficulty * 0.14 + Math.random() * 0.25),
        bulletSpeed: isBazooka
          ? -(215 + difficulty * 10 + Math.random() * 18)
          : isGrunt
            ? -(330 + difficulty * 18 + Math.random() * 26)
            : -(255 + difficulty * 16 + Math.random() * 24),
        bulletDamage: isBazooka ? 13 + Math.round(difficulty * 2) : isGrunt ? 6 : 10 + Math.round(difficulty * 2),
        scoreValue: isBazooka ? 58 + Math.round(difficulty * 12) : isGrunt ? 46 + Math.round(difficulty * 10) : isShooter ? 38 + Math.round(difficulty * 9) : 28 + Math.round(scale * 12),
      }),
    );
  }

  getMovementInput() {
    let x = 0;
    let y = 0;

    if (this.input.keysHeld.has("KeyA") || this.input.keysHeld.has("ArrowLeft")) {
      x -= 1;
    }
    if (this.input.keysHeld.has("KeyD") || this.input.keysHeld.has("ArrowRight")) {
      x += 1;
    }
    if (this.input.keysHeld.has("KeyW") || this.input.keysHeld.has("ArrowUp")) {
      y -= 1;
    }
    if (this.input.keysHeld.has("KeyS") || this.input.keysHeld.has("ArrowDown")) {
      y += 1;
    }

    if (x !== 0 || y !== 0) {
      return { x, y };
    }

    if (!this.input.pointerHeld) {
      return { x: 0, y: 0 };
    }

    const player = this.players[0];
    if (!player) {
      return { x: 0, y: 0 };
    }

    const dx = this.input.pointerX - player.x;
    const dy = this.input.pointerY - player.y;
    const deadZone = 18;

    return {
      x: Math.abs(dx) > deadZone ? Math.sign(dx) : 0,
      y: Math.abs(dy) > deadZone ? Math.sign(dy) : 0,
    };
  }

  spawnObstacle(difficulty) {
    const stage = this.getCurrentStageConfig();
    if (this.selectedMode === "campaign" && stage) {
      if (!stage.allowObstacles) {
        return;
      }
      if (this.obstacles.filter((obstacle) => obstacle.active).length >= stage.maxObstacles) {
        return;
      }
    }

    const patterns = [
      { kind: "boot", destructible: true, health: 2, scale: 0.9 + Math.random() * 0.6, scoreValue: 18 },
      { kind: "hook", destructible: false, health: 999, scale: 0.9 + Math.random() * 0.5, scoreValue: 0 },
    ];
    const chestChance = this.selectedMode === "campaign" && stage ? stage.chestChance : 0.12;
    if (!this.chestSpawnedThisRun && this.elapsed > 14 && Math.random() < chestChance) {
      patterns.push({ kind: "chest", destructible: true, health: 3, scale: 0.9 + Math.random() * 0.25, scoreValue: 26 });
    }
    const config = patterns[Math.floor(Math.random() * patterns.length)];
    if (config.kind === "chest") {
      this.chestSpawnedThisRun = true;
    }
    this.obstacles.push(
      new Obstacle({
        x: this.canvas.width + 60,
        y: 84 + Math.random() * (this.canvas.height - 168),
        speed: config.kind === "chest" ? 150 + difficulty * 20 + Math.random() * 36 : 170 + difficulty * 28 + Math.random() * 70,
        kind: config.kind,
        destructible: config.destructible,
        scale: config.scale,
        health: config.health,
        damage: config.kind === "chest" ? 12 : config.destructible ? 10 : 18,
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

  spawnHealingPickupAt({ x, y }) {
    this.healingPickups.push(
      new HealingPickup({
        x,
        y,
        speed: 18,
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

  spawnCoinPickup({ x, y, amount, spread = false, spreadStrength = 1 }) {
    const coinCount = spread ? amount : 1;

    for (let i = 0; i < coinCount; i += 1) {
      const angle = -0.95 + (coinCount === 1 ? 0 : (i / Math.max(1, coinCount - 1)) * 1.9);
      const burst = spread ? (48 + Math.random() * 42) * spreadStrength : 0;
      this.coinPickups.push(
        new CoinPickup({
          x: x + (spread ? (-10 + Math.random() * 20) * spreadStrength : 0),
          y: y + (spread ? (-8 + Math.random() * 16) * spreadStrength : 0),
          amount: spread ? 1 : amount,
          speed: 96 + Math.random() * 24,
          velocityX: Math.cos(angle) * burst,
          velocityY: Math.sin(angle) * burst * 0.65,
        }),
      );
    }
  }

  handleEnemyDestroyed(enemy) {
    this.score += enemy.scoreValue;
    this.spawnCoinPickup({
      x: enemy.x,
      y: enemy.y,
      amount: enemy.kind === "bazooka" ? 3 : enemy.kind === "shooter" ? 2 : 1,
      spread: enemy.kind === "shooter" || enemy.kind === "bazooka",
      spreadStrength: enemy.kind === "bazooka" ? 1.35 : enemy.kind === "shooter" ? 1.05 : 1,
    });
    this.effects.push(new ExplosionEffect({ x: enemy.x, y: enemy.y, scale: enemy.scale }));
  }

  handleObstacleDestroyed(obstacle) {
    this.score += obstacle.scoreValue;
    if (obstacle.kind === "chest") {
      this.spawnCoinPickup({
        x: obstacle.x,
        y: obstacle.y,
        amount: 5,
        spread: true,
        spreadStrength: 1.6,
      });
    }
    this.effects.push(new ExplosionEffect({ x: obstacle.x, y: obstacle.y, scale: obstacle.scale * 0.75 }));
  }

  detonatePlayerExplosion(bullet, x, y) {
    bullet.active = false;
    const radius = bullet.explosionRadius;
    this.effects.push(new ExplosionEffect({ x, y, scale: 1.1 }));

    for (const enemy of this.enemies) {
      if (!enemy.active || !circleOverlap({ x, y }, enemy, radius)) {
        continue;
      }
      const destroyed = enemy.takeDamage(bullet.damage);
      this.effects.push(new HitEffect({ x: enemy.x, y: enemy.y, scale: 0.9 + enemy.scale * 0.18, direction: 1, color: "#fb923c" }));
      if (destroyed) {
        this.handleEnemyDestroyed(enemy);
      }
    }

    if (this.boss?.active && circleOverlap({ x, y }, this.boss, radius)) {
      this.effects.push(new HitEffect({ x: this.boss.x - 40, y: this.boss.y, scale: 1.4, direction: 1, color: "#fb923c" }));
      const destroyed = this.boss.takeDamage(bullet.damage);
      if (destroyed) {
        this.handleBossDefeat();
      }
    }

    for (const obstacle of this.obstacles) {
      if (!obstacle.active || !circleOverlap({ x, y }, obstacle, radius)) {
        continue;
      }
      const destroyed = obstacle.takeDamage(bullet.damage);
      this.effects.push(new HitEffect({ x: obstacle.x, y: obstacle.y, scale: 0.8 + obstacle.scale * 0.16, direction: 1, color: "#fb923c" }));
      if (destroyed) {
        this.handleObstacleDestroyed(obstacle);
      }
    }
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
          if (bullet.explosionRadius > 0) {
            this.detonatePlayerExplosion(bullet, bullet.x, bullet.y);
            hit = true;
            break;
          }
          bullet.active = false;
          hit = true;
          this.effects.push(new HitEffect({
            x: bullet.x,
            y: bullet.y,
            scale: 0.8 + enemy.scale * 0.18,
            direction: 1,
            color: "#fde047",
          }));
          const destroyed = enemy.takeDamage(bullet.damage);
          if (destroyed) {
            this.handleEnemyDestroyed(enemy);
          }
          break;
        }
      }

      if (hit) {
        continue;
      }

      if (this.boss?.active && circleRectOverlap(bullet, this.boss)) {
        if (bullet.explosionRadius > 0) {
          this.detonatePlayerExplosion(bullet, bullet.x, bullet.y);
          continue;
        }
        bullet.active = false;
        this.effects.push(new HitEffect({
          x: bullet.x,
          y: bullet.y,
          scale: 1.35,
          direction: 1,
          color: "#fb7185",
        }));
        const destroyed = this.boss.takeDamage(bullet.damage);
        if (destroyed) {
          this.handleBossDefeat();
        }
        continue;
      }

      for (const obstacle of this.obstacles) {
        if (!obstacle.active) {
          continue;
        }
        if (circleRectOverlap(bullet, obstacle)) {
          if (bullet.explosionRadius > 0) {
            this.detonatePlayerExplosion(bullet, bullet.x, bullet.y);
            break;
          }
          bullet.active = false;
          this.effects.push(new HitEffect({
            x: bullet.x,
            y: bullet.y,
            scale: 0.72 + obstacle.scale * 0.16,
            direction: 1,
            color: obstacle.destructible ? "#fbbf24" : "#cbd5e1",
          }));
          const destroyed = obstacle.takeDamage(bullet.damage);
          if (destroyed) {
            this.handleObstacleDestroyed(obstacle);
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

      if (this.boss?.active && rectOverlap(player, this.boss)) {
        player.takeDamage(28);
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
        if (bullet.explosionRadius > 0) {
          this.effects.push(new ExplosionEffect({ x: bullet.x, y: bullet.y, scale: 0.95 }));
        }
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

      for (const pickup of this.coinPickups) {
        if (!pickup.active || !rectOverlap(player, pickup)) {
          continue;
        }

        pickup.active = false;
        this.coins += pickup.amount;
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
    this.coinPickups = this.coinPickups.filter((pickup) => pickup.active);
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
    this.ui.coinValue.textContent = this.coins;
    this.ui.healthFill.style.transform = `scaleX(${ratio})`;
    this.ui.healthLabel.textContent = `${Math.ceil(health)} / ${maxHealth}`;
  }

  render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.renderBackground(ctx, canvas);
    if (this.boss?.active) {
      this.boss.drawTelegraph(ctx);
    }

    this.players.forEach((player) => player.draw(ctx, this.assets));
    this.enemies.forEach((enemy) => enemy.draw(ctx, this.assets));
    this.obstacles.forEach((obstacle) => obstacle.draw(ctx, this.assets));
    if (this.boss?.active) {
      this.boss.draw(ctx, this.assets);
    }
    this.healingPickups.forEach((pickup) => pickup.draw(ctx, this.assets));
    this.upgradePickups.forEach((pickup) => pickup.draw(ctx, this.assets));
    this.coinPickups.forEach((pickup) => pickup.draw(ctx, this.assets));
    this.bullets.forEach((bullet) => bullet.draw(ctx, this.assets));
    this.enemyBullets.forEach((bullet) => bullet.draw(ctx, this.assets));
    this.effects.forEach((effect) => effect.draw(ctx, this.assets));

    if (this.state === "start") {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "bold 20px Trebuchet MS";
      ctx.fillText("Карась уже заряжает пушку...", 26, canvas.height - 26);
    }

    if (this.boss?.active) {
      this.renderBossHud(ctx, canvas);
    }
    if (this.stageBannerTimer > 0 && this.selectedMode === "campaign" && this.state === "running" && !this.boss) {
      this.renderStageBanner(ctx, canvas);
    }
  }

  renderBossHud(ctx, canvas) {
    const width = 300;
    const height = 16;
    const x = canvas.width * 0.5 - width * 0.5;
    const y = 104;
    const ratio = Math.max(0, this.boss.health / this.boss.maxHealth);

    ctx.save();
    ctx.fillStyle = "rgba(7, 32, 57, 0.82)";
    ctx.fillRect(x - 10, y - 28, width + 20, height + 38);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(x, y, width * ratio, height);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 16px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(this.boss.secondPhase ? "Бронированная Треска · Фаза 2" : "Бронированная Треска", x + width * 0.5, y - 8);
    ctx.restore();
  }

  renderStageBanner(ctx, canvas) {
    const progress = Math.min(1, this.stageBannerTimer / 2.2);
    ctx.save();
    ctx.globalAlpha = Math.min(1, progress * 1.4);
    ctx.fillStyle = "rgba(7, 32, 57, 0.74)";
    ctx.fillRect(canvas.width * 0.5 - 170, canvas.height - 88, 340, 42);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 20px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(this.stageBannerText, canvas.width * 0.5, canvas.height - 60);
    ctx.restore();
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
