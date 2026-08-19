import { MODULE_ID } from "../constants.js";
import { getSocket } from "../socket.js";
import { ContractScroll } from "./ContractScroll.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ContractControl extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance = null;

  static DEFAULT_OPTIONS = {
    id: "elevators-and-more-contract-control",
    classes: ["elevators-and-more", "contract-control"],
    tag: "div",
    window: { title: "ELEVATORS_AND_MORE.Contract.ControlTitle", icon: "fa-solid fa-scroll" },
    position: { width: 340, height: "auto" },
    actions: {
      send: ContractControl.onSend,
      unroll: ContractControl.onUnroll,
      recall: ContractControl.onRecall,
      preview: ContractControl.onPreview
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/contract-control.hbs` }
  };

  static open() {
    if (!ContractControl.#instance) ContractControl.#instance = new ContractControl();
    ContractControl.#instance.render({ force: true });
    return ContractControl.#instance;
  }

  _onClose(options) {
    ContractControl.#instance = null;
    return super._onClose(options);
  }

  async _prepareContext() {
    const players = game.users.filter((user) => user.active && !user.isGM);
    return {
      players: players.map((user) => ({ id: user.id, name: user.name, color: user.color?.css ?? user.color })),
      hasPlayers: players.length > 0
    };
  }

  #targets() {
    const select = this.element?.querySelector(".eam-contract-target");
    const value = select?.value ?? "all";
    if (value === "all") {
      return game.users.filter((user) => user.active && !user.isGM).map((user) => user.id);
    }
    return [value];
  }

  static async onSend() {
    const targets = this.#targets();
    if (!targets.length) return ui.notifications.warn(game.i18n.localize("ELEVATORS_AND_MORE.Contract.NoPlayers"));
    await dispatch("contractShow", targets);
    ui.notifications.info(game.i18n.localize("ELEVATORS_AND_MORE.Contract.Sent"));
  }

  static async onUnroll() {
    if (ContractScroll.isOpen()) ContractScroll.unroll();
    await dispatch("contractUnroll", this.#targets());
  }

  static async onRecall() {
    if (ContractScroll.isOpen()) ContractScroll.close();
    await dispatch("contractClose", this.#targets());
  }

  static onPreview() {
    ContractScroll.show();
  }
}

async function dispatch(handler, targets) {
  if (!targets?.length) return;
  try {
    await getSocket()?.executeForUsers(handler, targets);
  } catch (err) {
    ui.notifications.warn(game.i18n.localize("ELEVATORS_AND_MORE.NoGM"));
  }
}

export function registerContractControls() {
  injectFonts();

  Hooks.on("getSceneControlButtons", (controls) => {
    const tokens = controls.tokens ?? controls.token;
    if (!tokens?.tools) return;
    tokens.tools.devilContract = {
      name: "devilContract",
      title: "ELEVATORS_AND_MORE.Contract.ControlTitle",
      icon: "fa-solid fa-scroll",
      button: true,
      visible: game.user.isGM,
      order: Object.keys(tokens.tools).length,
      onChange: () => ContractControl.open()
    };
  });

  const moduleApi = game.modules.get(MODULE_ID);
  if (moduleApi) {
    moduleApi.api = Object.assign(moduleApi.api ?? {}, {
      openContractControl: () => ContractControl.open(),
      previewContract: () => ContractScroll.show()
    });
  }
}

function injectFonts() {
  if (document.getElementById("eam-contract-fonts")) return;
  const link = document.createElement("link");
  link.id = "eam-contract-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=UnifrakturCook:wght@700&family=Cinzel:wght@600;700&family=IM+Fell+English:ital@0;1&display=swap";
  document.head.appendChild(link);
}
