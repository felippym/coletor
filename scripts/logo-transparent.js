/**
 * Converte o fundo (preto e branco) do logo.png em transparência.
 */
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const publicDir = path.join(__dirname, "..", "public");
const logoPath = path.join(publicDir, "logo.png");
const BLACK_THRESHOLD = 40;
const WHITE_THRESHOLD = 235;

function isBlack(r, g, b) {
  return r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD;
}

function isWhite(r, g, b) {
  return r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
}

async function main() {
  if (!fs.existsSync(logoPath)) {
    console.error("logo.png não encontrado em public/");
    process.exit(1);
  }

  const { data, info } = await sharp(logoPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isBlack(r, g, b) || isWhite(r, g, b)) {
      data[i + 3] = 0;
    }
  }

  const tempPath = path.join(publicDir, "logo-temp.png");
  await sharp(data, {
    raw: { width, height, channels },
  })
    .png()
    .toFile(tempPath);

  fs.renameSync(tempPath, logoPath);
  console.log("Logo com fundo transparente gerado.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
