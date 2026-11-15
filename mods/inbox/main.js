// Inbox: what needs you, from every source in ./sources. ↑/↓ or j/k to move,
// Enter or click to jump there, Esc to close. Opened with mod.open:inbox.

import { View, div } from "gpui-kit";
import { v_flex, h_flex, ScrollHandle } from "gpui-base";
import { theme, props, closeOverlay } from "herdr";
import { SOURCES } from "./sources/index.js";

const SECTIONS = [
  { id: "now", label: "NEEDS YOU" },
  { id: "later", label: "FINISHED" },
];
const MINUTE = 60_000;
const DOWN = ["down", "j", "ctrl-n"];
const UP = ["up", "k", "ctrl-p"];

function since(ms) {
  if (!ms) return "";
  const m = Math.floor((Date.now() - ms) / MINUTE);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

// One broken source shows as a row instead of blanking the inbox.
function errorItem(source, message) {
  return { key: `error-${source.id}`, section: "now", badge: "ERROR", tone: "blocked",
    title: `${source.id} source failed`, body: message, time: null, open: () => {} };
}

function sourceItems(source) {
  try {
    const items = source.items();
    if (!Array.isArray(items)) return [errorItem(source, "items() must return an array")];
    return items;
  } catch (err) {
    return [errorItem(source, String(err?.message ?? err))];
  }
}

// Sections in order, newest first within each, empty ones dropped.
function grouped() {
  const all = SOURCES.flatMap(sourceItems);
  return SECTIONS.map((s) => ({
    ...s,
    items: all.filter((i) => i.section === s.id).sort((a, b) => (b.time ?? 0) - (a.time ?? 0)),
  })).filter((s) => s.items.length > 0);
}

export default class Inbox extends View {
  init(_props, cx) {
    this.at = 0;
    this.selectedKey = null;
    this.scroll = ScrollHandle.new();
    this.handle = cx.focus_handle();
    this.handle.focus();
    cx.timer.every(MINUTE, (cx) => cx.notify());
  }

  close() {
    const overlay = props()?.overlay;
    if (overlay) closeOverlay(overlay);
  }

  open(item) {
    if (!item) return;
    this.close();
    item.open();
  }

  key(e, cx, flat) {
    const k = e.keystroke;
    if (DOWN.includes(k)) this.at = Math.min(this.at + 1, flat.length - 1);
    else if (UP.includes(k)) this.at = Math.max(this.at - 1, 0);
    else if (k === "enter") return this.open(flat[this.at]);
    else return;
    this.selectedKey = flat[this.at]?.key ?? null;
    cx.stop_propagation();
    cx.notify();
  }

  render() {
    const t = theme();
    const sections = grouped();
    const flat = sections.flatMap((s) => s.items);
    // Follow the selected item when rows above it come or go; else keep the position.
    const kept = flat.findIndex((i) => i.key === this.selectedKey);
    this.at = kept >= 0 ? kept : Math.max(0, Math.min(this.at, flat.length - 1));
    const selected = flat[this.at];
    this.selectedKey = selected?.key ?? null;

    const heading = (s) => div().px(14).pt(10).pb(4).text_size(11).font_medium().text_color(t.dim)
      .child(`${s.label} · ${s.items.length}`);

    const row = (i) => h_flex().id(i.key).w_full().px(14).py(8).gap(10).items_start().cursor_pointer()
      .when(i === selected, (el) => el.bg(t.selected))
      .hover((s) => s.bg(t.hover))
      .on_click(() => this.open(i))
      .child(div().w(62).flex_none().mt(1).py(2).rounded(4).bg(t.raised).text_color(t[i.tone] ?? t.muted)
        .text_size(10).font_semibold().text_center().child(i.badge))
      .child(v_flex().flex_1().min_w(0).gap(2)
        .child(h_flex().gap(8).items_center()
          .child(div().flex_1().min_w(0).truncate().font_medium().child(i.title))
          .child(div().flex_none().text_size(11).text_color(t.dim).child(since(i.time))))
        .when(Boolean(i.body), (el) => el.child(div().truncate().text_size(12).text_color(t.muted).child(i.body))));

    const children = sections.flatMap((s) => [heading(s), ...s.items.map(row)]);
    // Child index of the selected row: its position plus one heading per section so far.
    const sectionsBefore = sections.findIndex((s) => s.items.includes(selected)) + 1;
    // Only when the selection moves, so a wheel scroll isn't undone by the next render.
    if (selected && this.scrolledTo !== selected.key) {
      this.scrolledTo = selected.key;
      this.scroll.scroll_to_item(this.at + sectionsBefore);
    }

    return v_flex().id("inbox").track_focus(this.handle).on_key_down((e, cx) => this.key(e, cx, flat))
      .size_full().min_h(0).bg(t.popover).text_color(t.foreground).text_size(13)
      .child(h_flex().flex_none().px(14).py(10).gap(8).items_center().border_b(1).border_color(t.border)
        .child(div().font_semibold().child("Inbox"))
        .child(div().text_size(11).text_color(t.dim).child(`${flat.length} open`)))
      .child(v_flex().id("inbox-list").flex_1().min_h(0).overflow_y_scrollbar().track_scroll(this.scroll)
        .children(children)
        .when(flat.length === 0, (el) => el.child(div().p(24).text_center().text_color(t.muted).child("Nothing needs you"))));
  }
}
