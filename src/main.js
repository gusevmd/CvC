const canvas = document.getElementById("game");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const startOverlay = document.getElementById("startOverlay");
const classPicker = document.getElementById("classPicker");
const modePicker = document.getElementById("modePicker");

function bindClassPicker(onSelect) {
  const buttons = Array.from(classPicker.querySelectorAll("[data-class-id]"));
  let selectedClassId = window.PlayerClasses.defaultId;

  const applySelection = (classId) => {
    selectedClassId = classId;
    buttons.forEach((button) => {
      button.classList.toggle("selected", button.dataset.classId === classId);
    });
    onSelect(classId);
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => applySelection(button.dataset.classId));
  });

  applySelection(selectedClassId);
}

function bindModePicker(onSelect) {
  const buttons = Array.from(modePicker.querySelectorAll("[data-mode]"));
  let selectedMode = "campaign";

  const applySelection = (mode) => {
    selectedMode = mode;
    buttons.forEach((button) => {
      button.classList.toggle("selected", button.dataset.mode === mode);
    });
    onSelect(mode);
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => applySelection(button.dataset.mode));
  });

  applySelection(selectedMode);
}

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
        coinValue: document.getElementById("coinValue"),
        healthFill: document.getElementById("healthFill"),
        healthLabel: document.getElementById("healthLabel"),
        classPicker,
        modePicker,
        startOverlay,
        gameOverOverlay: document.getElementById("gameOverOverlay"),
        gameOverTitle: document.getElementById("gameOverTitle"),
        gameOverScore: document.getElementById("gameOverScore"),
        walletValue: document.getElementById("walletValue"),
        upgradeHealthButton: document.getElementById("upgradeHealthButton"),
        upgradeFireRateButton: document.getElementById("upgradeFireRateButton"),
        upgradeMagnetButton: document.getElementById("upgradeMagnetButton"),
        upgradeSpeedButton: document.getElementById("upgradeSpeedButton"),
        restartButton,
      },
    });

    bindClassPicker((classId) => game.setSelectedClass(classId));
    bindModePicker((mode) => game.setSelectedMode(mode));
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
