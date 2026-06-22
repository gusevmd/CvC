const canvas = document.getElementById("game");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const startOverlay = document.getElementById("startOverlay");

async function bootstrap() {
  startButton.disabled = true;
  startButton.textContent = "Загрузка ассетов...";

  try {
    const assets = await window.GameAssets.loadAssets();
    const game = new GameScene({
      canvas,
      assets,
      ui: {
        scoreValue: document.getElementById("scoreValue"),
        healthFill: document.getElementById("healthFill"),
        healthLabel: document.getElementById("healthLabel"),
        startOverlay,
        gameOverOverlay: document.getElementById("gameOverOverlay"),
        gameOverScore: document.getElementById("gameOverScore"),
      },
    });

    startButton.disabled = false;
    startButton.textContent = "Старт";
    startButton.addEventListener("click", () => game.startGame());
    restartButton.addEventListener("click", () => game.startGame());
    game.start();
  } catch (error) {
    startOverlay.querySelector(".card p").textContent = "Не удалось загрузить игровые ассеты.";
    startButton.textContent = "Ошибка загрузки";
  }
}

bootstrap();
