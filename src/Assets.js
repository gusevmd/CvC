const atlasUrl = "./assets/sprites/game-sprites.png";
const healingUrl = "./assets/sprites/runtime/bandage-pickup.png";
const upgradeUrl = "./assets/sprites/runtime/upgrade-pickup.png";
const engineerUrl = "./assets/sprites/runtime/player-engineer.png";
const medicUrl = "./assets/sprites/runtime/player-medic.png";
const codShooterUrl = "./assets/sprites/runtime/enemy-cod-shooter.png";

const spriteMap = {
  player: { sx: 115, sy: 175, sw: 405, sh: 230 },
  enemyCod: { sx: 575, sy: 170, sw: 375, sh: 220 },
  bigCod: { sx: 985, sy: 140, sw: 500, sh: 275 },
  boot: { sx: 205, sy: 580, sw: 320, sh: 215 },
  hook: { sx: 720, sy: 560, sw: 155, sh: 245 },
  bullet: { sx: 1145, sy: 655, sw: 85, sh: 85 },
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function loadAssets() {
  const [atlasImage, healingImage, upgradeImage, engineerImage, medicImage, codShooterImage] = await Promise.all([
    loadImage(atlasUrl),
    loadImage(healingUrl),
    loadImage(upgradeUrl),
    loadImage(engineerUrl),
    loadImage(medicUrl),
    loadImage(codShooterUrl),
  ]);
  return {
    atlasImage,
    healingImage,
    upgradeImage,
    engineerImage,
    medicImage,
    codShooterImage,
    spriteMap,
  };
}

window.GameAssets = {
  loadAssets,
  spriteMap,
};
