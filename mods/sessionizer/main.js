// tmux-sessionizer for Herdr: a popup listing folders from the places in
// sessionizer.json (config.js), on this computer and on other machines
// (folders.js). Type to filter with fzf's matching (match.js), ↑/↓ (or
// ctrl-n/ctrl-p) and Enter to pick, Esc to leave. Picking a folder that
// already has a space on its machine shows that space; otherwise it makes a
// space there, on that machine, named after the folder.
//
// This computer's folders show as soon as they're listed; each machine's join
// when it answers. A machine that can't be reached gets a note, not an error.

import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { run, spaces, theme, props, closeOverlay } from "herdr";
import { readConfig } from "./config.js";
import { listFolders, normalize, pretty } from "./folders.js";
import { matcher } from "./match.js";

const ROW_HEIGHT = 30;
const VISIBLE_ROWS = 12;

const basename = (path) => path.slice(path.lastIndexOf("/") + 1) || path;
const parentOf = (path) => path.slice(0, path.length - basename(path).length);
const sameFolder = (a, b) => a && b && a.machine === b.machine && a.path === b.path;

export default class Sessionizer extends View {
  init(_props, cx) {
    this.places = [];
    this.listed = new Map(); // place -> its folders, once listed
    this.folders = [];
    this.match = () => [];
    this.found = [];
    this.error = null; // the config or this computer's listing failed
    this.notes = []; // other machines that couldn't be listed
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
    cx.spawn(async (cx) => this.load(cx));
  }

  async load(cx) {
    try {
      this.places = await readConfig();
    } catch (e) {
      this.fail(`Couldn't read folders: ${e?.message ?? e}`, e, cx);
      return;
    }
    for (const place of this.places) cx.spawn(async (cx) => this.list(place, cx));
  }

  async list(place, cx) {
    try {
      this.listed.set(place, await listFolders(place));
    } catch (e) {
      if (!place.machine) return this.fail(`Couldn't list folders: ${e?.message ?? e}`, e, cx);
      this.listed.set(place, []);
      this.notes = [...this.notes, `${place.machine}: ${e?.message ?? e}`];
      console.error(`sessionizer: ${place.machine}:`, e);
    }
    if (!place.machine) this.loading = false;
    this.folders = this.places.flatMap((p) => this.listed.get(p) ?? []);
    this.match = matcher(this.folders, pretty);
    this.refilter({ keepSelection: true });
    cx.notify();
  }

  fail(message, e, cx) {
    this.error = message;
    this.loading = false;
    console.error("sessionizer:", e);
    cx.notify();
  }

  // Matches the query again. With keepSelection (a machine's folders just
  // arrived), the highlighted folder stays highlighted if it still matches.
  refilter({ keepSelection = false } = {}) {
    const selected = this.found[this.at];
    this.found = this.match(this.query);
    const kept = keepSelection ? this.found.findIndex((f) => sameFolder(f, selected)) : -1;
    if (kept < 0) {
      this.at = 0;
      this.top = 0;
      return;
    }
    this.at = kept;
    if (this.at < this.top) this.top = this.at;
    if (this.at >= this.top + VISIBLE_ROWS) this.top = this.at - VISIBLE_ROWS + 1;
  }

  close() {
    closeOverlay(props().overlay);
  }

  go(folder) {
    if (!folder) return;
    this.close();
    const { machine, path } = folder;
    const existing = spaces().find((s) => (s.machine ?? null) === machine && s.folder && normalize(s.folder) === path);
    if (existing) run("space.select", { id: existing.id });
    else run("space.new", { folder: path, name: basename(path), machine: machine ?? "" });
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
    const parent = pretty({ machine: null, path: parentOf(folder.path), home: folder.home });
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
      .child(div().text_color(t.foreground).when(on, (d) => d.font_semibold()).child(basename(folder.path)))
      .when(Boolean(folder.machine), (el) => el.child(div().text_size(11).text_color(t.accent).child(folder.machine)))
      .child(div().flex_1().truncate().text_size(11).text_color(t.dim).child(parent));
  }

  // Under the list: an error, else what's still loading or why nothing shows,
  // then a note per machine that couldn't be listed, then the counts.
  footer(t, count) {
    const waiting = this.places.filter((p) => p.machine && !this.listed.has(p)).map((p) => p.machine);
    const line = (text, color) => div().px(10).text_size(12).text_color(color).truncate().child(text);
    const status = this.error ?? (this.loading ? "Listing folders…" : count ? null : "No matching folders");
    return [
      status ? line(status, this.error ? t.blocked : t.dim).py(6) : null,
      waiting.length ? line(`Listing ${waiting.join(", ")}…`, t.dim) : null,
      ...this.notes.map((n) => line(n, t.dim)),
      div().px(10).text_size(11).text_color(t.dim).child(`${count} / ${this.folders.length}`),
    ].filter(Boolean);
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
      .children(this.footer(t, found.length));
  }
}
