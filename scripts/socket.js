import { MODULE_ID } from "./constants.js";
import { getShaftFloors, getShaftState, setShaftState, regionCenter, markTeleport } from "./elevator/state.js";

let socket = null;

export function getSocket() {
  return socket;
}

export function setupSocket() {
  socket = socketlib.registerModule(MODULE_ID);
  socket.register("callElevator", onCallElevator);
  socket.register("travelElevator", onTravelElevator);
  socket.register("setDoorState", onSetDoorState);
}

async function onCallElevator(shaftId, floorUuid) {
  const floors = getShaftFloors(shaftId);
  const state = getShaftState(shaftId, floors);
  if (state.status === "calling") return;
  if (state.currentFloorUuid === floorUuid) return;

  await setShaftState(shaftId, { status: "calling", callFloorUuid: floorUuid });

  const delay = Number(game.settings.get(MODULE_ID, "callDelay") ?? 5) * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  await setShaftState(shaftId, { status: "idle", currentFloorUuid: floorUuid, callFloorUuid: null });
}

async function onTravelElevator(shaftId, tokenUuid, destUuid) {
  const token = await fromUuid(tokenUuid);
  const destRegion = await fromUuid(destUuid);
  if (!token || !destRegion) return null;

  const destScene = destRegion.parent;
  markTeleport(destUuid);

  if (typeof destRegion.teleportToken === "function") {
    await destRegion.teleportToken(token, { placement: "center", avoidOccupied: true });
  } else {
    const center = regionCenter(destRegion);
    if (!center) return null;
    const gridSize = destScene.grid.size;
    const x = center.x - (token.width * gridSize) / 2;
    const y = center.y - (token.height * gridSize) / 2;
    await token.update({ x, y }, { animate: false });
  }

  await setShaftState(shaftId, { status: "idle", currentFloorUuid: destUuid, callFloorUuid: null });
  return { sceneId: destScene.id };
}

async function onSetDoorState(wallUuid, ds) {
  const wall = await fromUuid(wallUuid);
  if (!wall) return;
  await wall.update({ ds });
}
