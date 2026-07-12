import { MODULE_ID, ELEVATOR_FLOOR_TYPE } from "../constants.js";
import { consumeTeleport } from "./state.js";
import { ElevatorApp } from "./ElevatorApp.js";

const fields = foundry.data.fields;

export class ElevatorFloorBehavior extends foundry.data.regionBehaviors.RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["ELEVATORS_AND_MORE.ElevatorFloor"];

  static defineSchema() {
    return {
      shaftId: new fields.StringField({ required: true, blank: false, initial: "shaft-1" }),
      floorLabel: new fields.StringField({ required: true, blank: false, initial: "Floor" }),
      order: new fields.NumberField({ required: false, integer: true, initial: 0 })
    };
  }

  static async onTokenMoveIn(event) {
    if (event.user?.id !== game.user?.id) return;
    const token = event.data?.token;
    if (!token) return;

    const regionUuid = event.region?.uuid ?? this.region?.uuid;
    if (!regionUuid) return;
    if (consumeTeleport(regionUuid)) return;

    ElevatorApp.open({
      shaftId: this.shaftId,
      floorUuid: regionUuid,
      tokenUuid: token.uuid
    });
  }

  static events = {
    [CONST.REGION_EVENTS.TOKEN_MOVE_IN]: ElevatorFloorBehavior.onTokenMoveIn
  };
}

export function registerElevatorBehavior() {
  Object.assign(CONFIG.RegionBehavior.dataModels, {
    [ELEVATOR_FLOOR_TYPE]: ElevatorFloorBehavior
  });
  CONFIG.RegionBehavior.typeIcons[ELEVATOR_FLOOR_TYPE] = "fa-solid fa-elevator";
}
