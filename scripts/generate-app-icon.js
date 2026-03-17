/**
 * Gera ícones PWA a partir do logo.png com fundo preto opaco (sem transparência).
 * iOS exige ícones sem transparência - áreas transparentes são preenchidas de preto.
 */
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const publicDir = path.join(__dirname, "..", "public");
const logoPath = path.join(publicDir, "logo.png");
const sizes = [180, 192, 512];

async function main() {
  if (!fs.existsSync(logoPath)) {
    console.error("logo.png não encontrado em public/");
    process.exit(1);
  }

  let img = await sharp(logoPath)
    .flatten({ background: { r: 0, g: 0, b: 0 } })
    .removeAlpha();

  const meta = await img.metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;
  const maxDim = Math.max(w, h);
  const padLeft = Math.floor((maxDim - w) / 2);
  const padTop = Math.floor((maxDim - h) / 2);

  const padded = await img
    .extend({
      top: padTop,
      bottom: maxDim - h - padTop,
      left: padLeft,
      right: maxDim - w - padLeft,
      background: { r: 0, g: 0, b: 0 },
    })
    .toBuffer();

  for (const size of sizes) {
    const outPath = path.join(publicDir, size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`);
    await sharp(padded)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`Gerado: ${path.basename(outPath)} (${size}x${size})`);
  }
  console.log("Ícones gerados com sucesso.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
