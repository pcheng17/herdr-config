// Headless: opening this mod makes a new tab at the end of its space, not
// after the active tab, shows it, then closes itself. cmd-t opens it bare;
// other mods open it as an overlay with tab.new's name, space, folder and argv
// as props.

import { View, div } from "gpui-kit";
import { run, props, focused, spaces, closeOverlay, checking } from "herdr";

export default class NewTab extends View {
  init() {
    if (checking()) return;
    const { overlay, name, space: id, folder, argv } = props() ?? {};
    if (overlay) closeOverlay(overlay);
    const args = { name, folder, argv };
    const space = spaces().find((s) => s.id === (id ?? focused()?.space));
    // No space open: tab.new starts one.
    if (!space) return run("tab.new", args);
    // focus false is what adds the tab last; tab.select then shows it.
    run("tab.new", { ...args, space: space.id, focus: false });
    run("tab.select", { index: space.tabs.length + 1 });
  }

  render() {
    return div();
  }
}
