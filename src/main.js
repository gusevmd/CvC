const canvas = document.getElementById("game");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const startOverlay = document.getElementById("startOverlay");
const classPicker = document.getElementById("classPicker");

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
        classPicker,
        startOverlay,
        gameOverOverlay: document.getElementById("gameOverOverlay"),
        gameOverScore: document.getElementById("gameOverScore"),
      },
    });

    bindClassPicker((classId) => game.setSelectedClass(classId));
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
