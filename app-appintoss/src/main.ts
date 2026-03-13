import Phaser from "phaser";
import { GardenGameScene } from "./scenes/GardenGameScene";
import "./styles.css";

const MOBILE_BASE_WIDTH = 390;
const MOBILE_BASE_HEIGHT = 844;
const APP_VIEWPORT_HEIGHT_CSS_VAR = "--app-viewport-height";
const GAME_RENDER_RESOLUTION = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));

const gameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: MOBILE_BASE_WIDTH,
  height: MOBILE_BASE_HEIGHT,
  resolution: GAME_RENDER_RESOLUTION,
  backgroundColor: "#f6f2df",
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: false
  },
  scene: [GardenGameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
    autoRound: false
  }
} as Phaser.Types.Core.GameConfig;

const isTextInputFocused = (): boolean => {
  const activeElement = document.activeElement as HTMLElement | null;
  if (!activeElement) {
    return false;
  }
  if (activeElement.isContentEditable) {
    return true;
  }
  const tagName = activeElement.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA";
};

const shouldFreezeViewportForKeyboard = (): boolean => isTextInputFocused();

const applyViewportHeight = (): void => {
  if (shouldFreezeViewportForKeyboard()) {
    return;
  }
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty(APP_VIEWPORT_HEIGHT_CSS_VAR, `${Math.max(1, Math.floor(viewportHeight))}px`);
};

let viewportFrameId: number | null = null;
const scheduleViewportHeightUpdate = (): void => {
  if (viewportFrameId !== null) {
    return;
  }
  viewportFrameId = window.requestAnimationFrame(() => {
    viewportFrameId = null;
    applyViewportHeight();
  });
};

scheduleViewportHeightUpdate();

const game = new Phaser.Game(gameConfig);
let refreshFrameId: number | null = null;
const refreshScale = () => {
  if (refreshFrameId !== null) {
    return;
  }
  refreshFrameId = window.requestAnimationFrame(() => {
    refreshFrameId = null;
    if (isTextInputFocused()) {
      return;
    }
    game.scale.refresh();
  });
};

const handleViewportChange = (): void => {
  scheduleViewportHeightUpdate();
  refreshScale();
};
const handleInputFocusOut = (): void => {
  window.requestAnimationFrame(() => {
    if (isTextInputFocused()) {
      return;
    }
    handleViewportChange();
  });
};

const visualViewport = window.visualViewport;
window.addEventListener("resize", handleViewportChange);
document.addEventListener("focusout", handleInputFocusOut);
if (visualViewport) {
  visualViewport.addEventListener("resize", handleViewportChange);
  visualViewport.addEventListener("scroll", scheduleViewportHeightUpdate);
}

window.addEventListener("beforeunload", () => {
  window.removeEventListener("resize", handleViewportChange);
  document.removeEventListener("focusout", handleInputFocusOut);
  if (visualViewport) {
    visualViewport.removeEventListener("resize", handleViewportChange);
    visualViewport.removeEventListener("scroll", scheduleViewportHeightUpdate);
  }

  if (refreshFrameId !== null) {
    window.cancelAnimationFrame(refreshFrameId);
    refreshFrameId = null;
  }
  if (viewportFrameId !== null) {
    window.cancelAnimationFrame(viewportFrameId);
    viewportFrameId = null;
  }

  game.destroy(true);
});
