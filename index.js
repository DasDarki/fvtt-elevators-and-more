import { registerSettings } from "./scripts/settings.js";
import { setupSocket } from "./scripts/socket.js";
import { registerElevatorBehavior } from "./scripts/elevator/behavior.js";
import { registerDoorControls } from "./scripts/doors/door-control.js";
import { registerItemSheetHooks } from "./scripts/doors/item-sheet.js";

Hooks.once("init", () => {
  registerSettings();
  registerElevatorBehavior();
  registerItemSheetHooks();
});

Hooks.once("setup", () => {
  registerDoorControls();
});

Hooks.once("socketlib.ready", () => {
  setupSocket();
});
