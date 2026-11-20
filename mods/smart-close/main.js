// Headless: opening this mod (cmd-w) asks before closing the focused pane when
// its tab has several, else before closing the tab, then closes itself. The
// shipped confirm dialog does the asking: Enter runs the command, Esc cancels.

import { View, div } from "gpui-kit";
import { run, props, focused, spaces, panes, openOverlay, closeOverlay } from "herdr";

const confirm = (title, name, args) =>
  openOverlay({ mod: "confirm", kind: "dialog", width: 360, height: 150, props: { title, command: { name, args } } });

export default class SmartClose extends View {
  init() {
    const f = focused();
    const overlay = props()?.overlay;
    if (overlay) closeOverlay(overlay);
    if (!f) return;
    if (f.pane && panes().filter((p) => p.tab === f.tab).length > 1) return confirm("Close pane?", "pane.close", { pane: f.pane });
    // Closing a space's last tab closes the space, and tab.close would ask
    // about that itself: say so here and pass confirmed, so it's one dialog.
    const last = spaces().find((s) => s.id === f.space)?.tabs.length === 1;
    confirm(last ? "Close space?" : "Close tab?", "tab.close", { id: f.tab, confirmed: last || undefined });
  }

  render() {
    return div();
  }
}
