export function cropPhoto(file: File): Promise<Blob | null> {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(null);
      img.onload = () => {
        const size = 480;
        const min = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.84);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
