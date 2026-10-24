import type { Camera, ImageObject } from '../types/board';

// In-memory cache for loaded HTMLImageElements
const imageElementCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement>>();

export function getCachedImage(src: string): HTMLImageElement | null {
  const cached = imageElementCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return cached;
  }
  return null;
}

export function preloadImage(src: string): Promise<HTMLImageElement> {
  if (imageElementCache.has(src)) {
    const img = imageElementCache.get(src)!;
    if (img.complete) return Promise.resolve(img);
  }
  if (loadingPromises.has(src)) {
    return loadingPromises.get(src)!;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageElementCache.set(src, img);
      loadingPromises.delete(src);
      resolve(img);
    };
    img.onerror = (err) => {
      loadingPromises.delete(src);
      reject(err);
    };
    img.src = src;
  });

  loadingPromises.set(src, promise);
  return promise;
}

/**
 * Creates an ImageObject from a browser File object (PNG, JPEG, WebP, SVG).
 */
export async function createImageFromFile(
  file: File,
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number
): Promise<ImageObject> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not a supported image'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        imageElementCache.set(src, img);
        const naturalWidth = img.naturalWidth || 400;
        const naturalHeight = img.naturalHeight || 300;

        // Scale to reasonable default board size (e.g. max 500px width/height)
        const maxInitialDimension = 450;
        const scale = Math.min(
          maxInitialDimension / naturalWidth,
          maxInitialDimension / naturalHeight,
          1
        );
        const targetWidth = Math.round(naturalWidth * scale);
        const targetHeight = Math.round(naturalHeight * scale);

        // Position in center of current camera viewport (in world coordinates)
        const centerScreenX = viewportWidth / 2;
        const centerScreenY = viewportHeight / 2;
        const worldCenterX = (centerScreenX - camera.panX) / camera.zoom;
        const worldCenterY = (centerScreenY - camera.panY) / camera.zoom;

        const imageObj: ImageObject = {
          id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: 'image',
          src,
          naturalWidth,
          naturalHeight,
          width: targetWidth,
          height: targetHeight,
          x: Math.round(worldCenterX - targetWidth / 2),
          y: Math.round(worldCenterY - targetHeight / 2),
          createdAt: Date.now(),
        };

        resolve(imageObj);
      };
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.src = src;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Renders an ImageObject onto the canvas.
 */
export function renderImage(ctx: CanvasRenderingContext2D, imgObj: ImageObject): void {
  const cached = getCachedImage(imgObj.src);

  if (cached) {
    ctx.drawImage(cached, imgObj.x, imgObj.y, imgObj.width, imgObj.height);
  } else {
    // If not loaded yet, initiate background load and draw a modern placeholder card
    preloadImage(imgObj.src).catch(() => {});
    ctx.save();
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.fillRect(imgObj.x, imgObj.y, imgObj.width, imgObj.height);
    ctx.strokeRect(imgObj.x, imgObj.y, imgObj.width, imgObj.height);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'Loading Image...',
      imgObj.x + imgObj.width / 2,
      imgObj.y + imgObj.height / 2
    );
    ctx.restore();
  }
}
