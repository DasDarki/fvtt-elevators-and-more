import { MODULE_ID } from "../constants.js";

export function getActiveActor() {
  const controlled = canvas?.tokens?.controlled ?? [];
  if (controlled.length > 0) return controlled[0].actor ?? null;
  return game.user?.character ?? null;
}

export function actorHasAnyKey(keyIds) {
  if (!keyIds?.length) return false;
  const actor = getActiveActor();
  if (!actor) return false;
  const wanted = new Set(keyIds);
  for (const item of actor.items) {
    const keyId = item.getFlag(MODULE_ID, "keyId");
    if (keyId && wanted.has(keyId)) return true;
  }
  return false;
}

export function findDoorsForKey(keyId) {
  const doors = [];
  if (!keyId) return doors;
  for (const scene of game.scenes) {
    const sceneDoors = scene.walls.filter((wall) => wall.door);
    sceneDoors.forEach((wall, index) => {
      const required = wall.getFlag(MODULE_ID, "requiredKeys");
      if (required?.includes(keyId)) {
        doors.push({
          wallUuid: wall.uuid,
          label: `${scene.name} · Door #${index + 1}`
        });
      }
    });
  }
  return doors;
}
