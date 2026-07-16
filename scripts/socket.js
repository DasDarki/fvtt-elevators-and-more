import { MODULE_ID } from "./constants.js";
import { getShaftFloors, getShaftState, setShaftState, regionCenter, markTeleport, tokensInRegion } from "./elevator/state.js";
import { ElevatorApp } from "./elevator/ElevatorApp.js";

let socket = null;

export function getSocket() {
  return socket;
}

export function setupSocket() {
  socket = socketlib.registerModule(MODULE_ID);
  socket.register("callElevator", onCallElevator);
  socket.register("travelElevator", onTravelElevator);
  socket.register("setDoorState", onSetDoorState);
  socket.register("viewScene", onViewScene);
  socket.register("closeElevator", onCloseElevator);
}

function onViewScene(sceneId) {
  game.scenes.get(sceneId)?.view();
}

function onCloseElevator(shaftId) {
  ElevatorApp.closeShaft(shaftId);
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

async function onTravelElevator(shaftId, sourceUuid, destUuid, presserTokenUuid) {
  const sourceRegion = await fromUuid(sourceUuid);
  const destRegion = await fromUuid(destUuid);
  if (!destRegion) return null;

  const destScene = destRegion.parent;

  let tokens = tokensInRegion(sourceRegion);
  if (!tokens.length && presserTokenUuid) {
    const presser = await fromUuid(presserTokenUuid);
    if (presser) tokens = [presser];
  }
  if (!tokens.length) return null;

  const sourceSceneId = sourceRegion?.parent?.id ?? tokens[0]?.parent?.id;
  const crossScene = !!sourceSceneId && sourceSceneId !== destScene.id;

  const affectedUserIds = new Set();
  for (const token of tokens) {
    const actor = token.actor;
    if (!actor) continue;
    for (const user of game.users) {
      if (user.active && !user.isGM && actor.testUserPermission(user, "OWNER")) affectedUserIds.add(user.id);
    }
  }

  markTeleport(destUuid);

  for (const token of tokens) {
    if (typeof destRegion.teleportToken === "function") {
      await destRegion.teleportToken(token, { placement: "center", avoidOccupied: true });
    } else {
      const center = regionCenter(destRegion);
      if (!center) continue;
      const gridSize = destScene.grid.size;
      const x = center.x - (token.width * gridSize) / 2;
      const y = center.y - (token.height * gridSize) / 2;
      await token.update({ x, y }, { animate: false });
    }
  }

  await setShaftState(shaftId, { status: "idle", currentFloorUuid: destUuid, callFloorUuid: null });

  const recipients = [...affectedUserIds];
  if (recipients.length) {
    socket?.executeForUsers("closeElevator", recipients, shaftId);
    if (crossScene) socket?.executeForUsers("viewScene", recipients, destScene.id);
  }

  return { sceneId: destScene.id };
}

async function onSetDoorState(wallUuid, ds) {
  const wall = await fromUuid(wallUuid);
  if (!wall) return;
  await wall.update({ ds });
}
