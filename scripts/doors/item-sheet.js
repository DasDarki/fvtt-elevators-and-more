import { MODULE_ID } from "../constants.js";
import { findDoorsForKey } from "./keys.js";
import { startLinking, stopLinking, isLinking, getLinking } from "./door-control.js";

export function registerItemSheetHooks() {
  Hooks.on("renderItemSheet", onRenderItemSheet);
  Hooks.on("renderItemSheetV2", onRenderItemSheet);

  Hooks.on(`${MODULE_ID}.doorsChanged`, async (itemUuid) => {
    const item = await fromUuid(itemUuid);
    if (item?.sheet?.rendered) item.sheet.render();
  });
}

async function onRenderItemSheet(app, html, data) {
  if (!game.user.isGM) return;

  const item = app.document ?? app.item;
  if (!item || item.documentName !== "Item") return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  const keyId = item.getFlag(MODULE_ID, "keyId") ?? null;
  const doors = findDoorsForKey(keyId);
  const linkingThis = isLinking() && getLinking()?.itemUuid === item.uuid;

  const content = await renderTemplateCompat(`modules/${MODULE_ID}/templates/item-key-config.hbs`, {
    hasKey: !!keyId,
    keyId,
    doors,
    linkingThis
  });

  root.querySelector(".elevators-and-more-key-config")?.remove();

  const wrapper = document.createElement("div");
  wrapper.innerHTML = content;
  const section = wrapper.firstElementChild;
  if (!section) return;

  const body = root.querySelector(".window-content") ?? root;
  body.appendChild(section);
  wireSection(section, item);
}

function wireSection(section, item) {
  const linkButton = section.querySelector(".eam-link-doors");
  linkButton?.addEventListener("click", async () => {
    if (isLinking() && getLinking()?.itemUuid === item.uuid) {
      stopLinking();
      return;
    }
    let keyId = item.getFlag(MODULE_ID, "keyId");
    if (!keyId) {
      keyId = foundry.utils.randomID();
      await item.setFlag(MODULE_ID, "keyId", keyId);
    }
    startLinking({ itemUuid: item.uuid, keyId });
    item.sheet.render();
  });

  for (const button of section.querySelectorAll(".eam-remove-door")) {
    button.addEventListener("click", async () => {
      const wallUuid = button.dataset.wallUuid;
      const keyId = item.getFlag(MODULE_ID, "keyId");
      const wall = await fromUuid(wallUuid);
      if (wall && keyId) {
        const current = wall.getFlag(MODULE_ID, "requiredKeys") ?? [];
        const next = current.filter((id) => id !== keyId);
        if (next.length) await wall.setFlag(MODULE_ID, "requiredKeys", next);
        else await wall.unsetFlag(MODULE_ID, "requiredKeys");
      }
      item.sheet.render();
    });
  }
}

async function renderTemplateCompat(path, context) {
  const renderTemplate = foundry.applications?.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  return renderTemplate(path, context);
}
