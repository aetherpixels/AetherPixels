// ═══════════════════════════════════════════════════════════
// AetherPixels — Image Processing Utility
// Compresses, converts to WebP, and generates thumbnails
// client-side before upload. Handles any input aspect ratio.
// ═══════════════════════════════════════════════════════════

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB — generous for phone camera photos
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Real file-format signatures ("magic bytes") for the formats we accept.
// The browser-reported file.type can be spoofed or simply wrong (e.g. a
// renamed .exe with a fake .jpg extension) — checking actual file bytes
// is the only reliable way to confirm what a file really is.
const MAGIC_BYTES = {
  "image/jpeg": [[0xFF, 0xD8, 0xFF]],
  "image/png":  [[0x89, 0x50, 0x4E, 0x47]],
  "image/gif":  [[0x47, 0x49, 0x46, 0x38]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]] // "RIFF" header (WebP container)
};

/**
 * Validates a File before any processing happens:
 * - rejects anything over MAX_UPLOAD_BYTES
 * - rejects any MIME type not in our allow-list (the accept="image/*"
 *   attribute on <input> is just a UI hint — it does NOT stop a user
 *   from selecting or dragging in a completely different file type)
 * - reads the first few real bytes of the file and checks them against
 *   known image format signatures, since file.type can be spoofed
 * Throws a user-friendly Error if any check fails.
 */
async function validateImageFile(file){
  if(!file) throw new Error("No file was selected.");

  if(file.size > MAX_UPLOAD_BYTES){
    throw new Error(`File is too large (${formatBytes(file.size)}). Maximum allowed size is ${formatBytes(MAX_UPLOAD_BYTES)}.`);
  }

  if(!ALLOWED_MIME_TYPES.includes(file.type)){
    throw new Error(`Unsupported file type: "${file.type || "unknown"}". Please upload a JPEG, PNG, WebP, or GIF image.`);
  }

  const header = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(header);
  const matchesAnySignature = Object.values(MAGIC_BYTES).some(signatures =>
    signatures.some(sig => sig.every((byte, i) => bytes[i] === byte))
  );

  if(!matchesAnySignature){
    throw new Error("This file doesn't look like a valid image (failed format check). It may be corrupted or not actually an image.");
  }
}

/**
 * Process a File/Blob into { full, thumb } WebP blobs ready for upload.
 * - full:  max 1920px on the longest side, quality 0.82
 * - thumb: 480×640 cover-cropped, quality 0.75 (grid card size)
 * Validates the file first — throws a clear error instead of silently
 * failing or wasting bandwidth on something that was never a real image.
 */
async function processImageForUpload(file){
  await validateImageFile(file);

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
