import { MODULE_ID } from "../constants.js";

export function registerSceneConfigHooks() {
  Hooks.on("renderSceneConfig", onRenderSceneConfig);
  Hooks.on("renderSceneConfigV2", onRenderSceneConfig);
}

async function onRenderSceneConfig(app, html) {
  if (!game.user.isGM) return;

  const scene = app.document ?? app.object;
  if (!scene || scene.documentName !== "Scene") return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  const content = await renderTemplateCompat(`modules/${MODULE_ID}/templates/scene-level-config.hbs`, {
    moduleId: MODULE_ID,
    levelIndex: scene.getFlag(MODULE_ID, "levelIndex") ?? "",
    anchorX: scene.getFlag(MODULE_ID, "anchorX") ?? 0,
    anchorY: scene.getFlag(MODULE_ID, "anchorY") ?? 0,
    levelName: scene.getFlag(MODULE_ID, "levelName") ?? ""
  });

  root.querySelector(".elevators-and-more-level-config")?.remove();

  const wrapper = document.createElement("div");
  wrapper.innerHTML = content;
  const section = wrapper.firstElementChild;
  if (!section) return;

  const body = root.querySelector(".window-content") ?? root;
  body.appendChild(section);
  wireSection(section, scene);
}

function wireSection(section, scene) {
  section.querySelector(".eam-anchor-center")?.addEventListener("click", () => {
    const dimensions = scene.dimensions;
    if (!dimensions) return;
    const x = dimensions.sceneX + dimensions.sceneWidth / 2;
    const y = dimensions.sceneY + dimensions.sceneHeight / 2;
    const inputX = section.querySelector(`[name="flags.${MODULE_ID}.anchorX"]`);
    const inputY = section.querySelector(`[name="flags.${MODULE_ID}.anchorY"]`);
    if (inputX) inputX.value = Math.round(x);
    if (inputY) inputY.value = Math.round(y);
  });
}

async function renderTemplateCompat(path, context) {
  const renderTemplate = foundry.applications?.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  return renderTemplate(path, context);
}
