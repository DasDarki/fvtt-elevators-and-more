import { MODULE_ID } from "./constants.js";
import { ElevatorApp } from "./elevator/ElevatorApp.js";

export function registerSettings() {
  game.settings.register(MODULE_ID, "shaftStates", {
    scope: "world",
    config: false,
    type: Object,
    default: {},
    onChange: () => ElevatorApp.refreshAll()
  });

  game.settings.register(MODULE_ID, "callDelay", {
    name: "ELEVATORS_AND_MORE.Settings.CallDelay.Name",
    hint: "ELEVATORS_AND_MORE.Settings.CallDelay.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 5,
    range: { min: 0, max: 60, step: 1 }
  });
}
