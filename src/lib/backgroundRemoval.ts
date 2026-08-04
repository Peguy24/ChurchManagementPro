export const removeBackground = async (
  imageElement: HTMLImageElement,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is not supported by this browser.");
  context.drawImage(imageElement, 0, 0);

  const source = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The photo could not be prepared."));
    }, "image/png");
  });

  const { removeBackground: removeImageBackground } = await import("@imgly/background-removal");
  return removeImageBackground(source, {
    model: "isnet_quint8",
    output: { format: "image/png", quality: 1, type: "foreground" },
    progress: (_key, current, total) => {
      if (total > 0) onProgress?.(Math.min(100, Math.round((current / total) * 100)));
    },
  });
};

export const loadImage = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
};
