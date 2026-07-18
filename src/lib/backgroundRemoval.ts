// Background removal via @huggingface/transformers was removed to eliminate a
// critical transitive dependency vulnerability (protobufjs advisory).
// The Remove Background action now throws so the caller shows an error toast.

export const removeBackground = async (
  _imageElement: HTMLImageElement,
  _onProgress?: (progress: number) => void
): Promise<Blob> => {
  throw new Error('Background removal is temporarily unavailable.');
};

export const loadImage = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};
