// The folders to pick from, set in sessionizer.json in the app's folder
// (~/.config/herdr-app, linked from ~/.herdr-config by install):
//   { "roots": ["~/dev", ...], "folders": ["~/.dotfiles", ...] }
// Each root's direct subfolders (fd --max-depth 1), then each fixed folder.
// Both keys are optional lists of paths; ~ means the home folder.

import { exec, home, appHome, readTextFile } from "herdr";

const CONFIG = "sessionizer.json";
const KEYS = ["roots", "folders"];

// fd prints folders with a trailing slash; spaces() reports them without.
export const normalize = (path) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

// A path for display: the home folder shown as ~.
export const pretty = (path) => {
  const h = home();
  return path === h ? "~" : path.startsWith(h + "/") ? "~" + path.slice(h.length) : path;
};

const expand = (path) => normalize(path === "~" ? home() : path.startsWith("~/") ? home() + path.slice(1) : path);

// Reads and checks the config; throws with what's wrong, naming the file.
async function readConfig() {
  const text = await readTextFile(`${appHome()}/${CONFIG}`);
  if (text === null) throw new Error(`no ${CONFIG} in ${pretty(appHome())}`);
  let config;
  try {
    config = JSON.parse(text);
  } catch (e) {
    throw new Error(`${CONFIG} isn't valid JSON: ${e.message}`);
  }
  if (typeof config !== "object" || config === null || Array.isArray(config)) throw new Error(`${CONFIG} must be an object`);
  const unknown = Object.keys(config).filter((k) => !KEYS.includes(k));
  if (unknown.length) throw new Error(`${CONFIG}: unknown key ${unknown.map((k) => `"${k}"`).join(", ")} (expected ${KEYS.join(", ")})`);
  for (const key of KEYS) {
    const list = config[key] ?? [];
    if (!Array.isArray(list) || !list.every((p) => typeof p === "string" && p.trim())) {
      throw new Error(`${CONFIG}: "${key}" must be a list of paths`);
    }
  }
  return { roots: (config.roots ?? []).map(expand), folders: (config.folders ?? []).map(expand) };
}

// Each root's direct subfolders. Missing roots are skipped (fd reports them on
// stderr and still lists the rest). No roots: no fd, which would search here.
async function subfolders(roots) {
  if (!roots.length) return [];
  const r = await exec("fd", ["--max-depth", "1", "--type", "d", ".", ...roots]);
  if (r.code !== 0 && !r.stdout) throw new Error(r.stderr.trim() || `fd exited ${r.code}`);
  return r.stdout.split("\n").filter(Boolean).map(normalize);
}

// Resolves with absolute folder paths, roots' subfolders first.
export async function listFolders() {
  const { roots, folders } = await readConfig();
  return [...new Set([...(await subfolders(roots)), ...folders])];
}
