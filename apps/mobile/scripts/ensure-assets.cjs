const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "assets");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

fs.mkdirSync(dir, { recursive: true });
for (const name of ["icon.png", "adaptive-icon.png", "splash-icon.png", "favicon.png"]) {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, png);
  }
}
