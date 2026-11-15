// Reads sessionizer.json from the app's folder (~/.config/herdr-app, linked
// from ~/.herdr-config by install):
//   {
//     "roots": ["~/dev"], "folders": ["~/.dotfiles"],
//     "machines": { "worker": { "roots": ["~/src"], "folders": ["/srv/api"] } }
//   }
// Top-level roots and folders are this computer's; each entry in machines is
// a machine named as in `hc machine ls`, with its own. Every key is optional.
// Paths stay as written: ~ is expanded where the folders are listed, since
// only that machine knows its home folder.

import { appHome, readTextFile } from "herdr";

export const CONFIG = "sessionizer.json";
const PLACE_KEYS = ["roots", "folders"];
const TOP_KEYS = [...PLACE_KEYS, "machines"];

const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

function checkKeys(where, value, allowed) {
  if (!isObject(value)) throw new Error(`${where} must be an object`);
  const unknown = Object.keys(value).filter((k) => !allowed.includes(k));
  if (unknown.length) throw new Error(`${where}: unknown key ${unknown.map((k) => `"${k}"`).join(", ")} (expected ${allowed.join(", ")})`);
}

// One place's roots and folders, each a list of non-empty paths (default []).
function place(where, value) {
  checkKeys(where, value, where === CONFIG ? TOP_KEYS : PLACE_KEYS);
  const out = {};
  for (const key of PLACE_KEYS) {
    const list = value[key] ?? [];
    if (!Array.isArray(list) || !list.every((p) => typeof p === "string" && p.trim())) {
      throw new Error(`${where}: "${key}" must be a list of paths`);
    }
    out[key] = list;
  }
  return out;
}

// Resolves with [{ machine, roots, folders }]: this computer first (machine
// null), then each configured machine in the file's order. Throws with what's
// wrong, naming the file.
export async function readConfig() {
  const text = await readTextFile(`${appHome()}/${CONFIG}`);
  if (text === null) throw new Error(`no ${CONFIG} in ${appHome()}`);
  let config;
  try {
    config = JSON.parse(text);
  } catch (e) {
    throw new Error(`${CONFIG} isn't valid JSON: ${e.message}`);
  }
  const places = [{ machine: null, ...place(CONFIG, config) }];
  const machines = config.machines ?? {};
  if (!isObject(machines)) throw new Error(`${CONFIG}: "machines" must be an object of machine names`);
  for (const [name, value] of Object.entries(machines)) {
    if (!name.trim()) throw new Error(`${CONFIG}: a machine name is empty`);
    places.push({ machine: name, ...place(`${CONFIG} machines.${name}`, value) });
  }
  return places;
}
