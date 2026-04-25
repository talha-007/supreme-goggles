const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "assets");
/** 1×1 transparent PNG — only written if `app-logo.png` is missing (CI / fresh clone). */
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

fs.mkdirSync(dir, { recursive: true });
const logo = path.join(dir, "app-logo.png");
if (!fs.existsSync(logo)) {
  fs.writeFileSync(logo, png);
}
