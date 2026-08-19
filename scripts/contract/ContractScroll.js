import { getSocket } from "../socket.js";
import { loadContractHtml } from "./markdown.js";

let overlay = null;
let pinHandle = null;
let keyHandler = null;

function t(key) {
  return game.i18n.localize(`ELEVATORS_AND_MORE.Contract.${key}`);
}

function pinToBottom() {
  const paper = overlay?.querySelector(".eam-contract-paper");
  if (paper) paper.scrollTop = paper.scrollHeight;
}

function startPinning() {
  stopPinning();
  const step = () => {
    pinToBottom();
    pinHandle = requestAnimationFrame(step);
  };
  pinHandle = requestAnimationFrame(step);
}

function stopPinning() {
  if (pinHandle) {
    cancelAnimationFrame(pinHandle);
    pinHandle = null;
  }
}

function smoothScrollToTop(el, duration) {
  const start = el.scrollTop;
  if (start <= 0) return;
  const startTime = performance.now();
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  const step = (now) => {
    if (!el.isConnected) return;
    const k = Math.min(1, (now - startTime) / duration);
    el.scrollTop = Math.round(start * (1 - ease(k)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function onSign(button) {
  button.disabled = true;
  button.classList.add("signed");
  button.textContent = t("Signed");
  overlay?.querySelector(".eam-contract-signline")?.classList.add("signed");
  try {
    getSocket()?.executeForAllGMs("contractSigned", game.user.id);
  } catch (err) {
    /* no GM connected */
  }
}

export const ContractScroll = {
  isOpen() {
    return !!overlay;
  },

  async show() {
    if (overlay) this.close();

    const html = await loadContractHtml();
    overlay = document.createElement("div");
    overlay.className = "eam-contract-overlay rolled";
    overlay.innerHTML = `
      <div class="eam-contract-backdrop"></div>
      <button type="button" class="eam-contract-dismiss" title="${t("Dismiss")}"><i class="fa-solid fa-xmark"></i></button>
      <div class="eam-contract-scroll">
        <div class="eam-contract-roller top"><span class="eam-contract-knob left"></span><span class="eam-contract-knob right"></span></div>
        <div class="eam-contract-viewport">
          <div class="eam-contract-paper">
            <div class="eam-contract-body">${html}</div>
            <div class="eam-contract-sign">
              <div class="eam-contract-seal">✶</div>
              <div class="eam-contract-signline">
                <span class="eam-contract-x">X</span>
                <span class="eam-contract-line"></span>
                <span class="eam-contract-role">${t("SignHere")}</span>
              </div>
              <button type="button" class="eam-contract-signbtn">${t("SignButton")}</button>
            </div>
          </div>
        </div>
        <div class="eam-contract-roller bottom"><span class="eam-contract-knob left"></span><span class="eam-contract-knob right"></span></div>
      </div>
      <div class="eam-contract-hint"></div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector(".eam-contract-dismiss").addEventListener("click", () => this.close());
    overlay.querySelector(".eam-contract-signbtn").addEventListener("click", (event) => onSign(event.currentTarget));
    keyHandler = (event) => {
      if (event.key === "Escape") this.close();
    };
    window.addEventListener("keydown", keyHandler);

    requestAnimationFrame(() => {
      overlay?.classList.add("entered");
      startPinning();
    });
  },

  unroll() {
    if (!overlay) return;
    if (overlay.classList.contains("unrolled")) return;
    overlay.classList.remove("rolled");
    overlay.classList.add("unrolling");

    startPinning();

    const viewport = overlay.querySelector(".eam-contract-viewport");
    const finish = () => {
      viewport?.removeEventListener("transitionend", finish);
      stopPinning();
      if (!overlay) return;
      overlay.classList.remove("unrolling");
      overlay.classList.add("unrolled");
      const hint = overlay.querySelector(".eam-contract-hint");
      if (hint) hint.textContent = t("ScrollHint");
      const paper = overlay.querySelector(".eam-contract-paper");
      if (paper) smoothScrollToTop(paper, 3500);
    };
    viewport?.addEventListener("transitionend", finish);
    setTimeout(finish, 31000);
  },

  close() {
    stopPinning();
    if (keyHandler) {
      window.removeEventListener("keydown", keyHandler);
      keyHandler = null;
    }
    if (!overlay) return;
    const node = overlay;
    overlay = null;
    node.classList.add("closing");
    setTimeout(() => node.remove(), 400);
  }
};
