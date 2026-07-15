"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QrCode({
  value,
  size = 160,
  className = "",
  onReady,
}: {
  value: string;
  size?: number;
  className?: string;
  onReady?: (canvas: HTMLCanvasElement | null) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#16140f", light: "#ffffff" },
    })
      .then(() => onReady?.(ref.current))
      .catch(() => {});
  }, [value, size, onReady]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      className={className}
      aria-label={`QR code linking to ${value}`}
      role="img"
    />
  );
}

export function downloadCanvas(canvas: HTMLCanvasElement | null, filename: string) {
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
