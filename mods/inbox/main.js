// The inbox mod draws two parts, picked by the layout block's props:
// { "part": "tabs" } is the tab bar with the Inbox button, anything else is
// the inbox panel. One folder, because a mod can't import another mod's files.

import { View } from "gpui-kit";
import { props } from "herdr";
import { TabBar } from "./tabs.js";
import { Panel } from "./panel.js";

export default class Inbox extends View {
  init(_props, cx) {
    this.part = props()?.part === "tabs" ? new TabBar(cx) : new Panel(cx);
  }

  render() {
    return this.part.render();
  }
}
