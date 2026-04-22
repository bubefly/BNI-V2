const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");

const images = [
  { input: "public/assets/images/places/bni-building.png", widths: [960, 1400, 1900], quality: 78 },
  { input: "public/assets/images/team/mia.png", widths: [520, 840], quality: 78 },
  { input: "public/assets/images/team/lucy.png", widths: [520, 840], quality: 78 },
  { input: "public/assets/images/team/muck.png", widths: [520, 840], quality: 78 },
  { input: "public/assets/images/team/jude.png", widths: [520, 840], quality: 78 },
  { input: "public/assets/images/team/riley.png", widths: [520, 840], quality: 78 },
  { input: "public/assets/images/team/nadir.png", widths: [520, 840], quality: 78 },
  { input: "public/assets/images/team/luna.png", widths: [520, 840], quality: 78 },
  { input: "public/assets/images/team/dutch.png", widths: [520, 840], quality: 78 },
  { input: "public/assets/images/team/trinity.png", widths: [520, 840], quality: 78 },
];

const buildImages = async () => {
  for (const image of images) {
    const inputPath = path.join(root, image.input);
    const parsed = path.parse(inputPath);
    const metadata = await sharp(inputPath).metadata();

    for (const requestedWidth of image.widths) {
      const width = Math.min(requestedWidth, metadata.width || requestedWidth);
      const outputPath = path.join(parsed.dir, `${parsed.name}-${requestedWidth}.webp`);

      await sharp(inputPath)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: image.quality, effort: 5 })
        .toFile(outputPath);

      const stats = await fs.stat(outputPath);
      const size = Math.round(stats.size / 1024);
      console.log(`${path.relative(root, outputPath)} ${size} KB`);
    }
  }
};

buildImages().catch((error) => {
  console.error(error);
  process.exit(1);
});
