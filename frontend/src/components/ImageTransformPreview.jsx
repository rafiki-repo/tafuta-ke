/**
 * ImageTransformPreview — Canvas 2D live preview of image transforms (PRD-07 §8).
 *
 * Props:
 *   file        {File|null}   – source for a new upload (URL.createObjectURL)
 *   imageUrl    {string|null} – source for an existing image (edit mode)
 *   transform   {object}      – 9 transform parameters (see DEFAULT_TRANSFORM)
 *   targetWidth {number}      – target output width  (used for canvas aspect ratio)
 *   targetHeight{number}      – target output height
 *
 * Transform pipeline order matches the sharp backend pipeline in media.js §8:
 *   1. CSS filter: brightness / contrast / saturation
 *   2. translate to centre → rotate → flip → zoom → translate by offset → drawImage
 */

import { useEffect, useRef, useCallback } from 'react';

const DEFAULT_TRANSFORM = {
  zoom: 1.0,
  offset_x: 0,
  offset_y: 0,
  rotation: 0,
  flip_horizontal: false,
  flip_vertical: false,
  brightness: 0,
  contrast: 0,
  saturation: 0,
};

const PREVIEW_W = 400; // fixed canvas display width (CSS pixels)

export default function ImageTransformPreview({
  file,
  imageUrl,
  transform = DEFAULT_TRANSFORM,
  targetWidth = 400,
  targetHeight = 400,
}) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const previewH = Math.round(PREVIEW_W * (targetHeight / targetWidth));

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete || !img.naturalWidth) return;

    const ctx = canvas.getContext('2d');
    const {
      zoom = 1.0,
      offset_x = 0,
      offset_y = 0,
      rotation = 0,
      flip_horizontal = false,
      flip_vertical = false,
      brightness = 0,
      contrast = 0,
      saturation = 0,
    } = { ...DEFAULT_TRANSFORM, ...transform };

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Step 1: CSS filter — brightness / contrast / saturation
    ctx.filter = `brightness(${1 + brightness}) contrast(${1 + contrast}) saturate(${1 + saturation})`;

    // Step 2: transforms
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flip_horizontal) ctx.scale(-1, 1);
    if (flip_vertical) ctx.scale(1, -1);

    // Scale image to cover the canvas, then apply zoom
    const scaleToFit = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const effectiveScale = scaleToFit * Math.max(1, zoom);
    const drawW = img.naturalWidth * effectiveScale;
    const drawH = img.naturalHeight * effectiveScale;

    // offset_x/y are in target-image pixels; translate proportionally in canvas space
    const oX = (offset_x / targetWidth) * w;
    const oY = (offset_y / targetHeight) * h;
    ctx.translate(oX, oY);

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [transform, targetWidth, targetHeight]);

  // Reload image when source changes
  useEffect(() => {
    if (!file && !imageUrl) {
      imgRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      draw();
    };

    let objectUrl = null;
    if (file) {
      objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    } else if (imageUrl) {
      img.src = imageUrl;
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw when transform changes
  useEffect(() => {
    draw();
  }, [draw]);

  const noSource = !file && !imageUrl;

  return (
    <div
      className="w-full rounded border border-border bg-muted overflow-hidden"
      style={{ aspectRatio: `${targetWidth} / ${targetHeight}` }}
    >
      {noSource ? (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
          No image selected
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={PREVIEW_W}
          height={previewH}
          className="w-full h-full"
        />
      )}
    </div>
  );
}
