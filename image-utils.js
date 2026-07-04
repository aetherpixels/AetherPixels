// ═══════════════════════════════════════════════════════════
// AetherPixels — Image Processing Utility
// Compresses, converts to WebP, and generates thumbnails
// client-side before upload. Handles any input aspect ratio.
// ═══════════════════════════════════════════════════════════

/**
 * Process a File/Blob into { full, thumb } WebP blobs ready for upload.
 * - full:  max 1920px on the longest side, quality 0.82
 * - thumb: 480×640 cover-cropped, quality 0.75 (grid card size)
 */
async function processImageForUpload(file){
  const img = await fileToImage(file);

  const full  = await resizeToWebP(img, { maxDim: 1920, quality: 0.82 });
  const thumb = await cropToWebP(img, { targetW: 480, targetH: 640, quality: 0.75 });

  return {
    full,
    thumb,
    width: img.width,
    height: img.height
  };
}

function fileToImage(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Scales the image down (never up) so its longest side <= maxDim, keeping aspect ratio.
function resizeToWebP(img, { maxDim, quality }){
  return new Promise((resolve) => {
    let { width, height } = img;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    width  = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);

    canvas.toBlob(blob => resolve(blob), "image/webp", quality);
  });
}

// Crops+scales the image to exactly targetW×targetH using cover-fit,
// so ANY input aspect ratio (ultra-wide, square, tall) becomes a clean thumbnail.
function cropToWebP(img, { targetW, targetH, quality }){
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");

    const scale = Math.max(targetW / img.width, targetH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (targetW - w) / 2;
    const y = (targetH - h) / 2;
    ctx.drawImage(img, x, y, w, h);

    canvas.toBlob(blob => resolve(blob), "image/webp", quality);
  });
}

/** Human-readable file size, used in admin UI upload feedback. */
function formatBytes(bytes){
  if(bytes < 1024) return bytes + " B";
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
  return (bytes/(1024*1024)).toFixed(2) + " MB";
}
