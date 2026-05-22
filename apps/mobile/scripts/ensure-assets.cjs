const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "assets");
/** 1×1 transparent PNG - only written if `app-logo.png` is missing (CI / fresh clone). */
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

fs.mkdirSync(dir, { recursive: true });
const logo = path.join(dir, "app-logo.png");
const brandMark = path.join(dir, "brand-mark.png");
const webBrand = path.join(__dirname, "..", "..", "web", "public", "taplite_obic.png");

if (fs.existsSync(webBrand)) {
  fs.copyFileSync(webBrand, brandMark);
  fs.copyFileSync(webBrand, logo);
} else {
  if (!fs.existsSync(logo)) {
    fs.writeFileSync(logo, png);
  }
  if (!fs.existsSync(brandMark)) {
    if (fs.existsSync(logo)) fs.copyFileSync(logo, brandMark);
    else fs.writeFileSync(brandMark, png);
  }
}

const androidRes = path.join(__dirname, "..", "android", "app", "src", "main", "res");
if (fs.existsSync(brandMark) && fs.existsSync(androidRes)) {
  for (const name of fs.readdirSync(androidRes)) {
    if (!name.startsWith("drawable")) continue;
    const sub = path.join(androidRes, name);
    if (!fs.statSync(sub).isDirectory()) continue;
    const splash = path.join(sub, "splashscreen_logo.png");
    if (fs.existsSync(splash)) {
      fs.copyFileSync(brandMark, splash);
    }
  }
}
