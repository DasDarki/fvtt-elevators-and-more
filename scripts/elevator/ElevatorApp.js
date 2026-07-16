import { MODULE_ID } from "../constants.js";
import { getSocket } from "../socket.js";
import { getShaftFloors, getShaftState } from "./state.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ElevatorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instances = new Map();

  static DEFAULT_OPTIONS = {
    classes: ["elevators-and-more", "elevator-app"],
    tag: "div",
    window: {
      icon: "fa-solid fa-elevator",
      contentClasses: ["standard-form"]
    },
    position: { width: 360, height: "auto" },
    actions: {
      call: ElevatorApp.onCall,
      travel: ElevatorApp.onTravel
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/elevator.hbs` }
  };

  #context;

  constructor(context, options = {}) {
    options.id = `elevators-and-more-${context.shaftId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
    super(options);
    this.#context = context;
  }

  get title() {
    return game.i18n.localize("ELEVATORS_AND_MORE.Elevator.Title");
  }

  static open(context) {
    const existing = ElevatorApp.#instances.get(context.shaftId);
    if (existing) {
      existing.#context = context;
      existing.render({ force: true });
      return existing;
    }
    const app = new ElevatorApp(context);
    ElevatorApp.#instances.set(context.shaftId, app);
    app.render({ force: true });
    return app;
  }

  static refreshAll() {
    for (const app of ElevatorApp.#instances.values()) {
      if (app.rendered) app.render();
    }
  }

  static closeShaft(shaftId) {
    ElevatorApp.#instances.get(shaftId)?.close();
  }

  _onClose(options) {
    ElevatorApp.#instances.delete(this.#context.shaftId);
    return super._onClose(options);
  }

  async _prepareContext() {
    const floors = getShaftFloors(this.#context.shaftId);
    const state = getShaftState(this.#context.shaftId, floors);
    const here = this.#context.floorUuid;
    const cabHere = state.currentFloorUuid === here;
    const cabFloor = floors.find((f) => f.uuid === state.currentFloorUuid);

    return {
      shaftId: this.#context.shaftId,
      calling: state.status === "calling",
      cabHere,
      cabFloorLabel: cabFloor?.label ?? "?",
      floors: floors.map((f) => ({
        uuid: f.uuid,
        label: f.label,
        isHere: f.uuid === here,
        isCab: f.uuid === state.currentFloorUuid
      }))
    };
  }

  static async onCall() {
    try {
      await getSocket()?.executeAsGM("callElevator", this.#context.shaftId, this.#context.floorUuid);
    } catch (err) {
      ui.notifications.warn(game.i18n.localize("ELEVATORS_AND_MORE.NoGM"));
    }
  }

  static async onTravel(event, target) {
    const destUuid = target?.dataset?.floorUuid;
    if (!destUuid) return;
    try {
      const result = await getSocket()?.executeAsGM(
        "travelElevator",
        this.#context.shaftId,
        this.#context.floorUuid,
        destUuid,
        this.#context.tokenUuid
      );
      if (result?.sceneId && result.sceneId !== canvas?.scene?.id) {
        game.scenes.get(result.sceneId)?.view();
      }
      this.close();
    } catch (err) {
      ui.notifications.warn(game.i18n.localize("ELEVATORS_AND_MORE.NoGM"));
    }
  }
}
