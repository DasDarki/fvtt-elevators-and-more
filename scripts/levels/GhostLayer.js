import { MODULE_ID } from "../constants.js";
import {
  LEVEL_OPENING_TYPE,
  getLevelConfig,
  getSceneForLevel,
  getRegionsOfType,
  pointInRegion,
  tokenCenter,
  toWorld,
  toScene
} from "./coords.js";

const GHOST_TINT = 0x8fa6cc;

let container = null;
let redrawHandle = null;
const sprites = new Map();

export function registerGhostLayer() {
  Hooks.on("canvasReady", () => {
    setupContainer();
    scheduleRedraw();
  });
  Hooks.on("updateToken", (doc, changes) => {
    if ("x" in changes || "y" in changes || "rotation" in changes || "hidden" in changes) scheduleRedraw();
  });
  Hooks.on("createToken", scheduleRedraw);
  Hooks.on("deleteToken", scheduleRedraw);
  Hooks.on("updateScene", scheduleRedraw);
  Hooks.on("createRegion", scheduleRedraw);
  Hooks.on("updateRegion", scheduleRedraw);
  Hooks.on("deleteRegion", scheduleRedraw);
  Hooks.on("createRegionBehavior", scheduleRedraw);
  Hooks.on("updateRegionBehavior", scheduleRedraw);
  Hooks.on("deleteRegionBehavior", scheduleRedraw);
}

export function scheduleRedraw() {
  if (redrawHandle) return;
  redrawHandle = setTimeout(() => {
    redrawHandle = null;
    redraw();
  }, 50);
}

function setupContainer() {
  sprites.clear();
  container = null;
  const parent = canvas?.tokens ?? canvas?.stage;
  if (!parent) return;
  container = new PIXI.Container();
  container.eventMode = "none";
  container.interactiveChildren = false;
  container.zIndex = -100;
  parent.addChildAt(container, 0);
}

function collectGhosts() {
  const current = canvas?.scene;
  if (!current) return [];

  const config = getLevelConfig(current);
  if (!config) return [];

  const below = getSceneForLevel(config.levelIndex - 1);
  if (!below) return [];

  const openings = getRegionsOfType(current, LEVEL_OPENING_TYPE).map((entry) => entry.region);
  if (!openings.length) return [];

  const isGM = game.user.isGM;
  const ghosts = [];

  for (const token of below.tokens) {
    if (token.hidden && !isGM) continue;

    const center = tokenCenter(token);
    const world = toWorld(below, center.x, center.y);
    if (!world) continue;
    const local = toScene(current, world.x, world.y);
    if (!local) continue;

    if (!openings.some((region) => pointInRegion(region, local.x, local.y))) continue;

    ghosts.push({ token, x: local.x, y: local.y });
  }

  return ghosts;
}

function redraw() {
  if (!container || container.destroyed) setupContainer();
  if (!container) return;

  const scene = canvas?.scene;
  if (!scene) return;

  const ghosts = collectGhosts();
  const baseAlpha = Number(game.settings.get(MODULE_ID, "ghostAlpha"));
  const alpha = Number.isFinite(baseAlpha) ? baseAlpha : 0.45;
  const gridSize = scene.grid.size;
  const seen = new Set();

  for (const ghost of ghosts) {
    const key = ghost.token.uuid;
    seen.add(key);

    let sprite = sprites.get(key);
    if (!sprite) {
      sprite = new PIXI.Sprite();
      sprite.anchor.set(0.5);
      sprite.eventMode = "none";
      container.addChild(sprite);
      sprites.set(key, sprite);
    }

    const src = ghost.token.texture?.src ?? "";
    if (sprite.eamSrc !== src) {
      sprite.eamSrc = src;
      const texture = src ? PIXI.Texture.from(src) : PIXI.Texture.EMPTY;
      sprite.texture = texture;
      if (texture !== PIXI.Texture.EMPTY && !texture.valid) texture.once("update", () => scheduleRedraw());
    }

    sprite.position.set(ghost.x, ghost.y);
    sprite.rotation = ((ghost.token.rotation ?? 0) * Math.PI) / 180;
    sprite.width = (ghost.token.width ?? 1) * gridSize;
    sprite.height = (ghost.token.height ?? 1) * gridSize;
    sprite.tint = GHOST_TINT;
    sprite.alpha = ghost.token.hidden ? alpha * 0.4 : alpha;
    sprite.visible = true;
  }

  for (const [key, sprite] of sprites) {
    if (seen.has(key)) continue;
    sprite.destroy();
    sprites.delete(key);
  }
}
