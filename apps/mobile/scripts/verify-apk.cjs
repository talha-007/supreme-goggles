/**
 * Quick sanity check before sharing/installing an APK.
 * Catches truncated/corrupt files that show "problem parsing package".
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const apkPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, "../android/app/build/outputs/apk/release/app-release.apk");

if (!fs.existsSync(apkPath)) {
  console.error(`APK not found: ${apkPath}`);
  process.exit(1);
}

const stat = fs.statSync(apkPath);
const fd = fs.openSync(apkPath, "r");
const header = Buffer.alloc(4);
fs.readSync(fd, header, 0, 4, 0);
fs.closeSync(fd);

if (header[0] !== 0x50 || header[1] !== 0x4b) {
  console.error("Invalid APK: missing ZIP header (file is corrupt or incomplete).");
  process.exit(1);
}

if (stat.size < 5 * 1024 * 1024) {
  console.error(`Invalid APK: size too small (${stat.size} bytes). Build likely failed or was interrupted.`);
  process.exit(1);
}

console.log(`APK OK: ${apkPath}`);
console.log(`Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);

const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (sdkRoot && fs.existsSync(sdkRoot)) {
  const buildToolsDir = path.join(sdkRoot, "build-tools");
  const versions = fs
    .readdirSync(buildToolsDir)
    .filter((name) => fs.existsSync(path.join(buildToolsDir, name, "aapt.exe")))
    .sort()
    .reverse();

  if (versions.length > 0) {
    const aapt = path.join(buildToolsDir, versions[0], "aapt.exe");
    try {
      const out = execSync(`"${aapt}" dump badging "${apkPath}"`, { encoding: "utf8" });
      const sdkMatch = out.match(/sdkVersion:'(\d+)'/);
      const abiMatch = out.match(/native-code: '([^']+)'/);
      if (sdkMatch) console.log(`minSdk: ${sdkMatch[1]} (device must be Android ${sdkMatch[1]}+)`);
      if (abiMatch) console.log(`ABIs: ${abiMatch[1]}`);
    } catch {
      console.warn("Could not read APK metadata with aapt (file still looks like a valid ZIP).");
    }
  }
}
