/**
 * Safe Android clean for React Native New Architecture.
 * Do NOT use `gradlew clean` — it runs externalNativeBuildClean* tasks that fail
 * when codegen JNI folders under node_modules are missing.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const relPaths = [
  "android/app/build",
  "android/build",
  "android/.cxx",
  "android/app/.cxx",
  "android/.gradle",
  "node_modules/@react-native-async-storage/async-storage/android/build",
  "node_modules/react-native-gesture-handler/android/build",
  "node_modules/react-native-pager-view/android/build",
  "node_modules/react-native-reanimated/android/build",
  "node_modules/react-native-safe-area-context/android/build",
  "node_modules/react-native-screens/android/build",
  "node_modules/react-native-svg/android/build",
  "node_modules/react-native-worklets/android/build",
  "node_modules/expo/android/build",
  "node_modules/expo-constants/android/build",
  "node_modules/expo-modules-core/android/build",
];

function rm(target) {
  if (!fs.existsSync(target)) return;
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    console.log(`removed ${path.relative(root, target)}`);
  } catch (err) {
    console.warn(`skipped ${path.relative(root, target)} (${err.code ?? err.message})`);
  }
}

for (const rel of relPaths) {
  rm(path.join(root, rel));
}

console.log("Android clean complete (manual, New Arch safe).");
