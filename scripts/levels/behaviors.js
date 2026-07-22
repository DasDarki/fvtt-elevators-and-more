import { getSocket } from "../socket.js";
import { isTeleportSuppressed } from "../elevator/state.js";
import { LEVEL_OPENING_TYPE, LEVEL_JUMP_DOWN_TYPE, getLevelConfig, getSceneForLevel } from "./coords.js";

const fields = foundry.data.fields;

export class LevelOpeningBehavior extends foundry.data.regionBehaviors.RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["ELEVATORS_AND_MORE.LevelOpening"];

  static defineSchema() {
    return {
      label: new fields.StringField({ required: false, blank: true, initial: "" })
    };
  }
}

export class LevelJumpDownBehavior extends foundry.data.regionBehaviors.RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["ELEVATORS_AND_MORE.LevelJumpDown"];

  static defineSchema() {
    return {
      targetLevelIndex: new fields.NumberField({ required: false, integer: true, nullable: true, initial: null })
    };
  }

  static async onTokenMoveIn(event) {
    if (event.user?.id !== game.user?.id) return;

    const token = event.data?.token;
    if (!token) return;

    const regionUuid = event.region?.uuid ?? this.region?.uuid;
    if (regionUuid && isTeleportSuppressed(regionUuid)) return;
    if (isTeleportSuppressed(token.actor?.uuid)) return;

    const config = getLevelConfig(token.parent);
    if (!config) {
      ui.notifications.warn(game.i18n.localize("ELEVATORS_AND_MORE.Levels.SceneNotALevel"));
      return;
    }

    const targetIndex = this.targetLevelIndex ?? config.levelIndex - 1;
    const targetScene = getSceneForLevel(targetIndex);
    if (!targetScene) {
      ui.notifications.warn(game.i18n.localize("ELEVATORS_AND_MORE.Levels.NoTargetLevel"));
      return;
    }

    const confirmed = await confirmJump(targetScene);
    if (!confirmed) return;

    try {
      const result = await getSocket()?.executeAsGM("jumpDown", token.uuid, targetScene.id);
      if (!result) {
        ui.notifications.warn(game.i18n.localize("ELEVATORS_AND_MORE.Levels.JumpFailed"));
        return;
      }
      if (result.sceneId && result.sceneId !== canvas?.scene?.id) {
        game.scenes.get(result.sceneId)?.view();
      }
    } catch (err) {
      ui.notifications.warn(game.i18n.localize("ELEVATORS_AND_MORE.NoGM"));
    }
  }

  static events = {
    [CONST.REGION_EVENTS.TOKEN_MOVE_IN]: LevelJumpDownBehavior.onTokenMoveIn
  };
}

async function confirmJump(targetScene) {
  const title = game.i18n.localize("ELEVATORS_AND_MORE.Levels.JumpTitle");
  const content = `<p>${game.i18n.format("ELEVATORS_AND_MORE.Levels.JumpPrompt", { level: targetScene.name })}</p>`;
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (DialogV2?.confirm) {
    return DialogV2.confirm({ window: { title }, content, modal: true, rejectClose: false });
  }
  return Dialog.confirm({ title, content });
}

export function registerLevelBehaviors() {
  Object.assign(CONFIG.RegionBehavior.dataModels, {
    [LEVEL_OPENING_TYPE]: LevelOpeningBehavior,
    [LEVEL_JUMP_DOWN_TYPE]: LevelJumpDownBehavior
  });
  CONFIG.RegionBehavior.typeIcons[LEVEL_OPENING_TYPE] = "fa-solid fa-cube";
  CONFIG.RegionBehavior.typeIcons[LEVEL_JUMP_DOWN_TYPE] = "fa-solid fa-person-falling";
}
