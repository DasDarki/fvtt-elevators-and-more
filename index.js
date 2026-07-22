import { registerSettings } from "./scripts/settings.js";
import { setupSocket } from "./scripts/socket.js";
import { registerElevatorBehavior } from "./scripts/elevator/behavior.js";
import { registerDoorControls } from "./scripts/doors/door-control.js";
import { registerItemSheetHooks } from "./scripts/doors/item-sheet.js";
import { registerLevelBehaviors } from "./scripts/levels/behaviors.js";
import { registerGhostLayer } from "./scripts/levels/GhostLayer.js";
import { registerSceneConfigHooks } from "./scripts/levels/scene-config.js";

Hooks.once("init", () => {
  registerSettings();
  registerElevatorBehavior();
  registerLevelBehaviors();
  registerItemSheetHooks();
  registerSceneConfigHooks();
  registerGhostLayer();
});

Hooks.once("setup", () => {
  registerDoorControls();
});

Hooks.once("socketlib.ready", () => {
  setupSocket();
});
