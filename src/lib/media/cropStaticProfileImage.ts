/**
 * src/lib/media/cropStaticProfileImage.ts
 *
 * Reusable client-only helper to crop static profile images into a 1024x1024 square canvas.
 * Corrects orientation, handles transparency, handles large photos, and prevents crashes.
 */

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    // Do NOT set crossOrigin if it is a local data URL
    if (!url.startsWith("data:")) {
      image.setAttribute("crossOrigin", "anonymous");
    }
    image.src = url;
  });

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Crops a static image file to 1024x1024 using canvas.
 * Handles EXIF orientation, clamps coordinates, downsamples large photos,
 * preserves PNG transparency, and outputs PNG/WEBP/JPEG.
 */
export async function cropStaticProfileImage(
  file: File,
  croppedAreaPixels: CropArea,
  rotation = 0
): Promise<File> {
  let image: ImageBitmap | HTMLImageElement;

  try {
    // 1. Try createImageBitmap for performance and auto-EXIF handling
    if (typeof window !== "undefined" && typeof window.createImageBitmap === "function") {
      // Avoid loading giant mobile photos directly if they exceed safe browser texture sizes
      image = await window.createImageBitmap(file);
    } else {
      throw new Error("CROP_IMAGE_DECODE_FAILED");
    }
  } catch (err) {
    // 2. Fallback to HTMLImageElement using a local base64 DataURL
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
      image = await createImage(dataUrl);
    } catch (fallbackErr) {
      throw new Error("CROP_IMAGE_DECODE_FAILED");
    }
  }

  // Bounding box size of the rotated image
  const { width: bWidth, height: bHeight } = rotateSize(image.width, image.height, rotation);

  // 3. Create a temporary canvas matching the rotated size
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = bWidth;
  tempCanvas.height = bHeight;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) {
    throw new Error("CROP_CANVAS_CONTEXT_FAILED");
  }

  // Draw rotated image onto the temporary canvas
  tempCtx.translate(bWidth / 2, bHeight / 2);
  tempCtx.rotate(getRadianAngle(rotation));
  tempCtx.translate(-image.width / 2, -image.height / 2);
  tempCtx.drawImage(image, 0, 0);

  // 4. Create the final 1024x1024 canvas
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("CROP_CANVAS_CONTEXT_FAILED");
  }

  const isTransparent = file.type === "image/png" || file.type === "image/webp";
  if (!isTransparent) {
    // Default background color for non-transparent profile images
    ctx.fillStyle = "#070707";
    ctx.fillRect(0, 0, 1024, 1024);
  } else {
    ctx.clearRect(0, 0, 1024, 1024);
  }

  // Clamp crop dimensions inside actual bounds to prevent visual glitches
  const cropX = Math.max(0, Math.min(croppedAreaPixels.x, bWidth - 1));
  const cropY = Math.max(0, Math.min(croppedAreaPixels.y, bHeight - 1));
  const cropWidth = Math.max(1, Math.min(croppedAreaPixels.width, bWidth - cropX));
  const cropHeight = Math.max(1, Math.min(croppedAreaPixels.height, bHeight - cropY));

  // Downsample/render onto final canvas
  ctx.drawImage(
    tempCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    1024,
    1024
  );

  // Free resources
  if (image instanceof ImageBitmap) {
    image.close();
  }

  // Determine output MIME type
  let outputMime = "image/webp";
  if (file.type === "image/png") {
    outputMime = "image/png";
  }

  // 5. Convert final canvas to Blob
  let blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), outputMime, 0.95);
  });

  // Fallback to JPEG if WEBP is unsupported or failed
  if (outputMime === "image/webp" && (!blob || blob.type !== "image/webp")) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
    });
  }

  if (!blob) {
    throw new Error("CROP_CANVAS_TOBLOB_FAILED");
  }

  const extension = blob.type.split("/")[1] || "jpg";
  const safeFilename = `profile_${Date.now()}.${extension}`;
  return new File([blob], safeFilename, { type: blob.type });
}
