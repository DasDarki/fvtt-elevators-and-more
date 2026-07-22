import { MODULE_ID } from "../constants.js";

export const LEVEL_OPENING_TYPE = `${MODULE_ID}.levelOpening`;
export const LEVEL_JUMP_DOWN_TYPE = `${MODULE_ID}.levelJumpDown`;

export function getBaseGridSize() {
  const value = Number(game.settings.get(MODULE_ID, "baseGridSize"));
  return Number.isFinite(value) && value > 0 ? value : 100;
}

export function getLevelConfig(scene) {
  if (!scene) return null;
  const raw = scene.getFlag(MODULE_ID, "levelIndex");
  if (raw === undefined || raw === null || raw === "") return null;
  const levelIndex = Number(raw);
  if (!Number.isFinite(levelIndex)) return null;
  return {
    scene,
    levelIndex,
    anchorX: Number(scene.getFlag(MODULE_ID, "anchorX") ?? 0) || 0,
    anchorY: Number(scene.getFlag(MODULE_ID, "anchorY") ?? 0) || 0,
    levelName: scene.getFlag(MODULE_ID, "levelName") || scene.name
  };
}

export function getLevelScale(scene) {
  const gridSize = scene?.grid?.size || 100;
  return getBaseGridSize() / gridSize;
}

export function toWorld(scene, x, y) {
  const config = getLevelConfig(scene);
  if (!config) return null;
  const scale = getLevelScale(scene);
  return { x: (x - config.anchorX) * scale, y: (y - config.anchorY) * scale };
}

export function toScene(scene, worldX, worldY) {
  const config = getLevelConfig(scene);
  if (!config) return null;
  const scale = getLevelScale(scene);
  return { x: worldX / scale + config.anchorX, y: worldY / scale + config.anchorY };
}

export function getSceneForLevel(levelIndex) {
  for (const scene of game.scenes) {
    const config = getLevelConfig(scene);
    if (config && config.levelIndex === levelIndex) return scene;
  }
  return null;
}

export function getRegionsOfType(scene, type) {
  const found = [];
  for (const region of scene?.regions ?? []) {
    for (const behavior of region.behaviors) {
      if (behavior.type !== type || behavior.disabled) continue;
      found.push({ region, behavior });
    }
  }
  return found;
}

export function tokenCenter(token) {
  const gridSize = token.parent?.grid?.size || 100;
  return {
    x: token.x + ((token.width ?? 1) * gridSize) / 2,
    y: token.y + ((token.height ?? 1) * gridSize) / 2
  };
}

function rotatePoint(px, py, degrees) {
  if (!degrees) return { x: px, y: py };
  const radians = (-degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: px * cos - py * sin, y: px * sin + py * cos };
}

function pointInShape(shape, x, y) {
  switch (shape.type) {
    case "rectangle": {
      const cx = shape.x + shape.width / 2;
      const cy = shape.y + shape.height / 2;
      const local = rotatePoint(x - cx, y - cy, shape.rotation ?? 0);
      return Math.abs(local.x) <= shape.width / 2 && Math.abs(local.y) <= shape.height / 2;
    }
    case "circle": {
      const dx = x - shape.x;
      const dy = y - shape.y;
      return dx * dx + dy * dy <= shape.radius * shape.radius;
    }
    case "ellipse": {
      const local = rotatePoint(x - shape.x, y - shape.y, shape.rotation ?? 0);
      const rx = shape.radiusX || 1;
      const ry = shape.radiusY || 1;
      return (local.x * local.x) / (rx * rx) + (local.y * local.y) / (ry * ry) <= 1;
    }
    case "polygon": {
      const points = shape.points ?? [];
      if (points.length < 6) return false;
      let inside = false;
      for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
        const xi = points[i];
        const yi = points[i + 1];
        const xj = points[j];
        const yj = points[j + 1];
        const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersects) inside = !inside;
      }
      return inside;
    }
    default:
      return false;
  }
}

export function pointInRegion(regionDoc, x, y) {
  let inside = false;
  for (const shape of regionDoc?.shapes ?? []) {
    if (!pointInShape(shape, x, y)) continue;
    if (shape.hole) return false;
    inside = true;
  }
  return inside;
}
