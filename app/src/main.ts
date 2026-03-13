import Phaser from "phaser";
import { GardenGameScene } from "./scenes/GardenGameScene";
import "./styles.css";

const MOBILE_BASE_WIDTH = 390;
const MOBILE_BASE_HEIGHT = 844;

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: MOBILE_BASE_WIDTH,
  height: MOBILE_BASE_HEIGHT,
  backgroundColor: "#f6f2df",
  scene: [GardenGameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true
  }
};

const game = new Phaser.Game(gameConfig);
const refreshScale = () => {
  game.scale.refresh();
};

window.addEventListener("resize", refreshScale);
window.visualViewport?.addEventListener("resize", refreshScale);

window.addEventListener("beforeunload", () => {
  window.removeEventListener("resize", refreshScale);
  window.visualViewport?.removeEventListener("resize", refreshScale);
  game.destroy(true);
});
