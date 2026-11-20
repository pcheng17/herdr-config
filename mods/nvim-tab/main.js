// Headless: opening this mod (the leader's e) starts nvim in a new tab at the
// focused space's folder, then closes itself. `exec` replaces the tab's shell
// with nvim, so :q closes the tab.

import { View, div } from "gpui-kit";
import { props, focused, spaces, openOverlay, closeOverlay } from "herdr";

export default class NvimTab extends View {
  init() {
    const space = spaces().find((s) => s.id === focused()?.space);
    // A space with no folder (home) falls back to tab.new's default: the pane's cwd.
    // Through new-tab, so the tab opens at the end of the space.
    openOverlay({ mod: "new-tab", kind: "popup", width: 1, height: 1, props: { name: "nvim", folder: space?.folder || undefined, argv: ["exec", "nvim"] } });
    const overlay = props()?.overlay;
    if (overlay) closeOverlay(overlay);
  }

  render() {
    return div();
  }
}
