// tmux-sessionizer for Herdr: a popup listing folders from preset places
// (folders.js). Type to filter with fzf's matching (match.js), ↑/↓ (or
// ctrl-n/ctrl-p) and Enter to pick, Esc to leave. Picking a folder that
// already has a space on this computer shows that space; otherwise it makes a
// space there, named after it.

import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { run, spaces, theme, props, closeOverlay } from "herdr";
import { listFolders, normalize, pretty } from "./folders.js";
import { matcher } from "./match.js";

const ROW_HEIGHT = 30;
const VISIBLE_ROWS = 12;

const basename = (path) => path.slice(path.lastIndexOf("/") + 1) || path;

export default class Sessionizer extends View {
  init(_props, cx) {
    this.folders = [];
    this.match = () => [];
    this.found = [];
    this.error = null;
    this.loading = true;
    this.query = "";
    this.at = 0;
    this.top = 0;
    this.input = InputState.new({ placeholder: "Open a folder as a space…" });
    this.input.on("change", (_e, cx) => {
      this.query = this.input.value().trim();
      this.refilter();
      cx.notify();
    });
    this.input.on("submit", () => this.go(this.found[this.at]));
    this.input.focus();
    // The popup can take focus back while it opens, as in the shipped picker.
    cx.timer.after(600, () => this.input.focus());
    cx.spawn(async (cx) => {
      try {
        this.folders = await listFolders();
        this.match = matcher(this.folders, pretty);
      } catch (e) {
        this.error = `Couldn't list folders: ${e?.message ?? e}`;
        console.error("sessionizer:", e);
      }
      this.loading = false;
      this.refilter();
      cx.notify();
    });
  }

  refilter() {
    this.found = this.match(this.query);
    this.at = 0;
    this.top = 0;
  }

  close() {
    closeOverlay(props().overlay);
  }

  go(folder) {
    if (!folder) return;
    this.close();
    const existing = spaces().find((s) => !s.machine && s.folder && normalize(s.folder) === folder);
    if (existing) run("space.select", { id: existing.id });
    else run("space.new", { folder, name: basename(folder), machine: "" });
  }

  move(by, count) {
    if (!count) return;
    this.at = (this.at + by + count) % count;
    if (this.at < this.top) this.top = this.at;
    if (this.at >= this.top + VISIBLE_ROWS) this.top = this.at - VISIBLE_ROWS + 1;
  }

  key(e, cx, count) {
    const ctrl = e.modifiers.control;
    if (e.key === "escape") return this.close();
    if (e.key === "down" || (ctrl && (e.key === "n" || e.key === "j"))) this.move(1, count);
    else if (e.key === "up" || (ctrl && (e.key === "p" || e.key === "k"))) this.move(-1, count);
    else return;
    cx.stop_propagation();
    cx.notify();
  }

  row(t, folder, i) {
    const on = i === this.at;
    const parent = pretty(folder.slice(0, folder.length - basename(folder).length));
    return h_flex()
      .id(`sz-${i}`)
      .h(ROW_HEIGHT)
      .flex_none()
      .px(10)
      .gap(8)
      .items_center()
      .rounded(7)
      .cursor_pointer()
      .when(on, (el) => el.bg(t.hover))
      .hover((s) => s.bg(t.hover))
      .on_click(() => this.go(folder))
      .child(div().text_color(t.foreground).when(on, (d) => d.font_semibold()).child(basename(folder)))
      .child(div().flex_1().truncate().text_size(11).text_color(t.dim).child(parent));
  }

  status(t, count) {
    const error = this.error;
    const text = error ?? (this.loading ? "Listing folders…" : count ? null : "No matching folders");
    return text ? div().px(10).py(6).text_size(12).text_color(error ? t.blocked : t.dim).child(text) : null;
  }

  render() {
    const t = theme();
    const found = this.found;
    this.at = Math.min(this.at, Math.max(0, found.length - 1));
    const shown = found.slice(this.top, this.top + VISIBLE_ROWS);
    return v_flex()
      .id("sessionizer")
      .w_full()
      .p(14)
      .gap(8)
      .bg(t.popover)
      .text_size(13)
      .on_key_down((e, cx) => this.key(e, cx, found.length))
      .child(
        h_flex().h(36).flex_none().px(10).items_center().rounded(9).border_1().border_color(t.accent).bg(t.background)
          .child(Input.new(this.input).flex_1().h_full().text_size(12.8).text_color(t.foreground)),
      )
      .child(
        v_flex()
          .on_scroll_wheel((e, cx) => {
            const max = Math.max(0, found.length - VISIBLE_ROWS);
            this.top = Math.max(0, Math.min(max, this.top + (e.delta.y < 0 ? 1 : -1)));
            this.at = Math.max(this.top, Math.min(this.at, this.top + VISIBLE_ROWS - 1));
            cx.notify();
          })
          .children(shown.map((f, i) => this.row(t, f, this.top + i))),
      )
      .children([this.status(t, found.length), div().px(10).text_size(11).text_color(t.dim).child(`${found.length} / ${this.folders.length}`)].filter(Boolean));
  }
}
