export const buildRasterMain = async (imgUrl: string): Promise<Uint8Array | null> => {
  const blob = await fetch(imgUrl).then((r) => r.blob());
  const bmp = await createImageBitmap(blob);
  const off = document.createElement("canvas");
  off.width = bmp.width;
  off.height = bmp.height;
  const ctx = off.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bmp, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, bmp.width, bmp.height);
  const raster = new Uint8Array(360 * 180);
  for (let y = 0; y < 180; y++) {
    for (let x = 0; x < 360; x++) {
      const sx = Math.floor((x / 360) * width);
      const sy = Math.floor((y / 180) * height);
      const idx = (sy * width + sx) << 2;
      const g = data[idx + 1];
      const b = data[idx + 2];
      raster[y * 360 + x] = g > b + 10 ? 1 : 0;
    }
  }
  return raster;
};
