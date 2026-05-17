/**
 * Strip Tailwind `dark:*` utilities (light-only UI; darkMode is "class" and .dark is never set).
 * Run: node web/scripts/strip-dark-variants.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, "..", "src");

/** Space + `dark:` + one class token (no spaces inside a single utility). */
const DARK_UTILITY = /\s+dark:[^\s"'`]+/g;

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(tsx|ts|css)$/.test(ent.name)) {
      const s = fs.readFileSync(p, "utf8");
      let t = s;
      let prev;
      do {
        prev = t;
        t = t.replace(DARK_UTILITY, "");
      } while (t !== prev);
      if (t !== s) fs.writeFileSync(p, t);
    }
  }
}

walk(srcRoot);
console.log("Stripped dark: variants under", srcRoot);
