import { MODULE_ID, ELEVATOR_FLOOR_TYPE } from "../constants.js";

export function getShaftFloors(shaftId) {
  const floors = [];
  for (const scene of game.scenes) {
    for (const region of scene.regions) {
      for (const behavior of region.behaviors) {
        if (behavior.type !== ELEVATOR_FLOOR_TYPE) continue;
        if (behavior.disabled) continue;
        if (behavior.system?.shaftId !== shaftId) continue;
        floors.push({
          uuid: region.uuid,
          label: behavior.system.floorLabel || region.name || "Floor",
          order: Number(behavior.system.order ?? 0),
          sceneId: scene.id
        });
      }
    }
  }
  floors.sort((a, b) => (a.order - b.order) || a.label.localeCompare(b.label));
  return floors;
}

export function getShaftState(shaftId, floors) {
  const all = game.settings.get(MODULE_ID, "shaftStates") ?? {};
  const stored = all[shaftId];
  if (stored?.currentFloorUuid) {
    return { status: "idle", callFloorUuid: null, ...stored };
  }
  return {
    currentFloorUuid: floors?.[0]?.uuid ?? null,
    status: "idle",
    callFloorUuid: null
  };
}

export async function setShaftState(shaftId, patch) {
  const all = foundry.utils.deepClone(game.settings.get(MODULE_ID, "shaftStates") ?? {});
  all[shaftId] = { ...(all[shaftId] ?? {}), ...patch };
  await game.settings.set(MODULE_ID, "shaftStates", all);
  return all[shaftId];
}

export function regionCenter(regionDoc) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const acc = (x0, y0, x1, y1) => {
    minX = Math.min(minX, x0);
    minY = Math.min(minY, y0);
    maxX = Math.max(maxX, x1);
    maxY = Math.max(maxY, y1);
  };
  for (const shape of regionDoc.shapes ?? []) {
    if (shape.hole) continue;
    switch (shape.type) {
      case "rectangle":
        acc(shape.x, shape.y, shape.x + shape.width, shape.y + shape.height);
        break;
      case "circle":
        acc(shape.x - shape.radius, shape.y - shape.radius, shape.x + shape.radius, shape.y + shape.radius);
        break;
      case "ellipse":
        acc(shape.x - shape.radiusX, shape.y - shape.radiusY, shape.x + shape.radiusX, shape.y + shape.radiusY);
        break;
      case "polygon": {
        const points = shape.points ?? [];
        for (let i = 0; i + 1 < points.length; i += 2) acc(points[i], points[i + 1], points[i], points[i + 1]);
        break;
      }
      default:
        break;
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

export function tokensInRegion(regionDoc) {
  if (!regionDoc) return [];
  if (regionDoc.tokens?.size) return [...regionDoc.tokens];
  const scene = regionDoc.parent;
  if (!scene) return [];
  return scene.tokens.filter((token) => token.regions?.has(regionDoc));
}

const suppressedRegions = new Map();

export function markTeleport(uuid, ms = 2500) {
  if (!uuid) return;
  suppressedRegions.set(uuid, Date.now() + ms);
}

export function isTeleportSuppressed(uuid) {
  const expiry = suppressedRegions.get(uuid);
  if (expiry === undefined) return false;
  if (Date.now() > expiry) {
    suppressedRegions.delete(uuid);
    return false;
  }
  return true;
}
