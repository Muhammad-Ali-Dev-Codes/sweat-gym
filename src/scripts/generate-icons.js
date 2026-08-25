const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const iconsDir = path.resolve(__dirname, "../public/icons");
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

function generateIcon(size, filename, maskable = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const padding = maskable ? size * 0.1 : 0;
  const innerSize = size - padding * 2;

  ctx.fillStyle = "#171717";
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const radius = innerSize * 0.35;

  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${innerSize * 0.18}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GYM", cx, cy - innerSize * 0.04);

  ctx.font = `${innerSize * 0.1}px sans-serif`;
  ctx.fillText("PWA", cx, cy + innerSize * 0.1);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(iconsDir, filename), buffer);
  console.log(`Generated ${filename} (${size}x${size})`);
}

generateIcon(192, "icon-192x192.png");
generateIcon(512, "icon-512x512.png");
generateIcon(192, "maskable-192x192.png", true);
generateIcon(512, "maskable-512x512.png", true);

console.log("All icons generated.");
