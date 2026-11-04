import { showMinimap } from "@replit/codemirror-minimap";
import type { Extension } from "@codemirror/state";

const createMinimap = () => {
  const dom = document.createElement("div");
  dom.setAttribute("aria-hidden", "true");
  return { dom };
};

export const minimap = (): Extension =>
  showMinimap.of({
    create: createMinimap,
    displayText: "characters",
    showOverlay: "always",
  });
