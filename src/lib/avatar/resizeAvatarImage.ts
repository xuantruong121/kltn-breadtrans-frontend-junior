/**
 * Shrinks a picked avatar photo to a centered square JPEG data URL.
 * A 256px JPEG is roughly 15-40 KB, well under the API's 100 KB JSON body limit,
 * while a raw 3 MB photo read as a data URL is about 4 MB and is rejected.
 */
export const AVATAR_SIZE_PX = 256;

export function resizeAvatarImage(file: File, size = AVATAR_SIZE_PX, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      if (!side) return reject(new Error("empty image"));
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("canvas unavailable"));
      // JPEG has no alpha: paint white under transparent PNG areas instead of black.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size, size);
      context.drawImage(
        image,
        (image.naturalWidth - side) / 2,
        (image.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size,
      );
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    image.src = url;
  });
}
