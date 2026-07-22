import { MODULE_ID } from "../constants.js";
import { getSocket } from "../socket.js";
import { actorHasAnyKey } from "./keys.js";

const DOOR_STATES = CONST.WALL_DOOR_STATES;

let linking = null;
let keydownHandler = null;

export function isLinking() {
  return !!linking;
}

export function getLinking() {
  return linking;
}

export function startLinking(context) {
  linking = context;
  renderBanner();
  keydownHandler = (event) => {
    if (event.key === "Escape") stopLinking();
  };
  window.addEventListener("keydown", keydownHandler);
}

export function stopLinking() {
  const context = linking;
  linking = null;
  removeBanner();
  if (keydownHandler) {
    window.removeEventListener("keydown", keydownHandler);
    keydownHandler = null;
  }
  if (context?.itemUuid) Hooks.callAll(`${MODULE_ID}.doorsChanged`, context.itemUuid);
}

export function registerDoorControls() {
  const DoorControl = foundry.canvas?.containers?.DoorControl ?? globalThis.DoorControl;
  if (!DoorControl?.prototype) {
    console.error(`${MODULE_ID} | DoorControl class not found; door key features disabled.`);
    return;
  }

  const targets = [
    ["_onMouseDown", onLeft],
    ["_onRightDown", onRight],
    ["_getTexture", onGetTexture],
    ["draw", onDraw]
  ];

  const hasLibWrapper = !!globalThis.libWrapper && globalThis.libWrapper.is_fallback === false;
  let patched = false;
  if (hasLibWrapper) {
    try {
      for (const [name, handler] of targets) {
        libWrapper.register(
          MODULE_ID,
          `foundry.canvas.containers.DoorControl.prototype.${name}`,
          function (original, ...args) {
            return handler.call(this, () => original(...args), ...args);
          },
          "MIXED"
        );
      }
      patched = true;
    } catch (err) {
      console.warn(`${MODULE_ID} | libWrapper registration failed, using manual patch.`, err);
    }
  }

  if (!patched) {
    for (const [name, handler] of targets) manualPatch(DoorControl.prototype, name, handler);
  }

  registerIndicatorHooks();
}

function manualPatch(proto, name, wrapper) {
  const marker = `__eam_${name}`;
  if (proto[marker]) return;
  const original = proto[name];
  if (typeof original !== "function") return;
  proto[marker] = original;
  proto[name] = function (...args) {
    return wrapper.call(this, () => original.apply(this, args), ...args);
  };
}

function onLeft(proceed, event) {
  const wall = this.wall?.document;
  if (!wall) return proceed();

  if (isLinking()) {
    void toggleLink(wall);
    return;
  }

  const required = wall.getFlag(MODULE_ID, "requiredKeys");
  if (!required?.length) return proceed();
  if (game.user.isGM) return proceed();

  if (!actorHasAnyKey(required)) {
    if (wall.ds === DOOR_STATES.OPEN) return proceed();
    ui.notifications.warn(game.i18n.localize("ELEVATORS_AND_MORE.Doors.Locked"));
    return;
  }

  const next = wall.ds === DOOR_STATES.OPEN ? DOOR_STATES.CLOSED : DOOR_STATES.OPEN;
  void requestDoorState(wall.uuid, next);
}

function onRight(proceed, event) {
  const wall = this.wall?.document;
  if (!wall) return proceed();

  if (isLinking()) {
    void toggleLink(wall);
    return;
  }

  const required = wall.getFlag(MODULE_ID, "requiredKeys");
  if (!required?.length) return proceed();
  if (game.user.isGM) return proceed();

  if (!actorHasAnyKey(required)) {
    ui.notifications.warn(game.i18n.localize("ELEVATORS_AND_MORE.Doors.Locked"));
    return;
  }

  const next = wall.ds === DOOR_STATES.LOCKED ? DOOR_STATES.CLOSED : DOOR_STATES.LOCKED;
  void requestDoorState(wall.uuid, next);
}

async function requestDoorState(wallUuid, ds) {
  try {
    await getSocket()?.executeAsGM("setDoorState", wallUuid, ds);
  } catch (err) {
    ui.notifications.warn(game.i18n.localize("ELEVATORS_AND_MORE.NoGM"));
  }
}

async function toggleLink(wall) {
  if (!game.user.isGM || !linking) return;
  const keyId = linking.keyId;
  const current = wall.getFlag(MODULE_ID, "requiredKeys") ?? [];
  let next;
  let added;
  if (current.includes(keyId)) {
    next = current.filter((id) => id !== keyId);
    added = false;
  } else {
    next = [...current, keyId];
    added = true;
  }
  if (next.length) await wall.setFlag(MODULE_ID, "requiredKeys", next);
  else await wall.unsetFlag(MODULE_ID, "requiredKeys");

  ui.notifications.info(
    game.i18n.localize(added ? "ELEVATORS_AND_MORE.Doors.DoorLinked" : "ELEVATORS_AND_MORE.Doors.DoorUnlinked")
  );
  Hooks.callAll(`${MODULE_ID}.doorsChanged`, linking.itemUuid);
}

function renderBanner() {
  removeBanner();
  const banner = document.createElement("div");
  banner.id = "elevators-and-more-linking-banner";
  banner.className = "elevators-and-more-linking-banner";

  const label = document.createElement("span");
  label.textContent = game.i18n.localize("ELEVATORS_AND_MORE.Doors.LinkingActive");

  const done = document.createElement("button");
  done.type = "button";
  done.textContent = game.i18n.localize("ELEVATORS_AND_MORE.Doors.LinkingDone");
  done.addEventListener("click", () => stopLinking());

  banner.append(label, done);
  document.body.appendChild(banner);
}

function removeBanner() {
  document.getElementById("elevators-and-more-linking-banner")?.remove();
}

const TINT_HAS_KEY = 0x54d97b;
const TINT_NO_KEY = 0xe0564f;
const TINT_NEUTRAL = 0xffffff;

function lockedTexture() {
  const path = CONFIG.controlIcons.doorLocked;
  const loader = foundry.canvas?.getTexture ?? globalThis.getTexture;
  const texture = typeof loader === "function" ? loader(path) : null;
  return texture ?? PIXI.Texture.from(path);
}

function onGetTexture(proceed) {
  const wall = this.wall?.document;
  const required = wall?.getFlag(MODULE_ID, "requiredKeys");
  if (required?.length && !game.user.isGM && wall.ds === DOOR_STATES.LOCKED) {
    return lockedTexture();
  }
  return proceed();
}

async function onDraw(proceed) {
  const result = await proceed();
  applyKeyTint(this);
  return result;
}

function applyKeyTint(control) {
  const icon = control?.icon;
  const wall = control?.wall?.document;
  if (!icon || !wall) return;

  const required = wall.getFlag(MODULE_ID, "requiredKeys");
  if (!required?.length || game.user.isGM) {
    icon.tint = TINT_NEUTRAL;
    return;
  }
  icon.tint = actorHasAnyKey(required) ? TINT_HAS_KEY : TINT_NO_KEY;
}

export function refreshDoorIndicators() {
  for (const wall of canvas?.walls?.placeables ?? []) {
    const control = wall.doorControl;
    if (!control?.icon) continue;
    const texture = control._getTexture();
    if (texture) control.icon.texture = texture;
    applyKeyTint(control);
  }
}

function scheduleIndicatorRefresh() {
  setTimeout(() => refreshDoorIndicators(), 50);
}

function registerIndicatorHooks() {
  Hooks.on("canvasReady", scheduleIndicatorRefresh);
  Hooks.on("controlToken", scheduleIndicatorRefresh);
  Hooks.on("updateWall", scheduleIndicatorRefresh);
  Hooks.on("createItem", scheduleIndicatorRefresh);
  Hooks.on("deleteItem", scheduleIndicatorRefresh);
}
