/**
 * Suppresses unhandled promise rejections from expo-keep-awake on Android when
 * activate() runs with no current Activity (bundling, background, lock screen).
 * Upstream: https://github.com/expo/expo/issues/23390
 */
const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "../node_modules/expo-keep-awake/src/index.ts");
const marker = "expo#23390";

if (!fs.existsSync(target)) {
  console.warn("patch-expo-keep-awake: expo-keep-awake not found, skip.");
  process.exit(0);
}

let s = fs.readFileSync(target, "utf8");
if (s.includes(marker)) {
  process.exit(0);
}

const oldBlock = `    activateKeepAwakeAsync(tagOrDefault).then(() => {
      if (isMounted && ExpoKeepAwake.addListenerForTag && options?.listener) {
        addListener(tagOrDefault, options.listener);
      }
    });`;

const newBlock = `    activateKeepAwakeAsync(tagOrDefault)
      .then(() => {
        if (isMounted && ExpoKeepAwake.addListenerForTag && options?.listener) {
          addListener(tagOrDefault, options.listener);
        }
      })
      .catch(() => {
        // No current Activity (e.g. Android dev / background during bundling). See expo#23390.
      });`;

if (!s.includes(oldBlock)) {
  console.warn(
    "patch-expo-keep-awake: expected useKeepAwake block not found (already patched or package updated), skip.",
  );
  process.exit(0);
}

fs.writeFileSync(target, s.replace(oldBlock, newBlock));
console.log("patch-expo-keep-awake: applied.");
