// Reads prs.json from the app's folder (~/.config/herdr-app, linked from
// ~/.herdr-config by install):
//   { "host": "github.rbx.com" }
// host is the GitHub the dashboard asks, as `gh --hostname` takes it; gh's
// login there is whose PRs it shows.

import { appHome, readTextFile } from "herdr";

export const CONFIG = "prs.json";
const KEYS = ["host"];

// Resolves with { host }. Throws with what's wrong, naming the file.
export async function readConfig() {
  const text = await readTextFile(`${appHome()}/${CONFIG}`);
  if (text === null) throw new Error(`no ${CONFIG} in ${appHome()}`);
  let config;
  try {
    config = JSON.parse(text);
  } catch (e) {
    throw new Error(`${CONFIG} isn't valid JSON: ${e.message}`);
  }
  if (typeof config !== "object" || config === null || Array.isArray(config)) throw new Error(`${CONFIG} must be an object`);
  const unknown = Object.keys(config).filter((k) => !KEYS.includes(k));
  if (unknown.length) throw new Error(`${CONFIG}: unknown key ${unknown.map((k) => `"${k}"`).join(", ")} (expected ${KEYS.join(", ")})`);
  if (typeof config.host !== "string" || !config.host.trim()) throw new Error(`${CONFIG}: "host" must be a GitHub host name, e.g. "github.com"`);
  return { host: config.host.trim() };
}
