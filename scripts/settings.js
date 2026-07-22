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

  game.settings.register(MODULE_ID, "baseGridSize", {
    name: "ELEVATORS_AND_MORE.Settings.BaseGridSize.Name",
    hint: "ELEVATORS_AND_MORE.Settings.BaseGridSize.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 100
  });

  game.settings.register(MODULE_ID, "ghostAlpha", {
    name: "ELEVATORS_AND_MORE.Settings.GhostAlpha.Name",
    hint: "ELEVATORS_AND_MORE.Settings.GhostAlpha.Hint",
    scope: "client",
    config: true,
    type: Number,
    default: 0.45,
    range: { min: 0, max: 1, step: 0.05 }
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
