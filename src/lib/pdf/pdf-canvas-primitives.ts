import {
  type PDFDocument,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { decodeImageBytes } from "@/lib/asset-utils";
import { BRAND_BLUE, TEXT_DARK } from "./pdf-tokens";

export async function embedOptionalImage(
  pdfDoc: PDFDocument,
  source: string | null | undefined,
): Promise<PDFImage | null> {
  const decoded = await decodeImageBytes(source);
  if (!decoded) return null;
  try {
    return decoded.format === "png"
      ? await pdfDoc.embedPng(decoded.bytes)
      : await pdfDoc.embedJpg(decoded.bytes);
  } catch {
    return null;
  }
}

export function fitDimensions(
  img: PDFImage,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  return {
    width: Math.max(1, img.width * scale),
    height: Math.max(1, img.height * scale),
  };
}

/**
 * Menggambar mark logo vektor default Altvira (simbol gelombang A-V setinggi ~14 mm)
 * apabila logo_storage_path belum diunggah di database.
 */
export function drawDefaultAltviraMark(page: PDFPage, x: number, topY: number) {
  // Kotak mark: lebar 38 pt, tinggi 34 pt (topY hingga topY - 34)
  const baseY = topY - 30;
  // Kaki kiri 'A' (Biru Altvira)
  page.drawLine({
    start: { x: x + 2, y: baseY + 4 },
    end: { x: x + 13, y: topY - 2 },
    thickness: 3.4,
    color: BRAND_BLUE,
  });
  // Kaki tengah miring dari puncak 'A' ke lembah 'V' (Biru Altvira)
  page.drawLine({
    start: { x: x + 13, y: topY - 2 },
    end: { x: x + 23, y: baseY + 2 },
    thickness: 3.4,
    color: BRAND_BLUE,
  });
  // Palang 'A'
  page.drawLine({
    start: { x: x + 6, y: baseY + 13 },
    end: { x: x + 16, y: baseY + 13 },
    thickness: 2.6,
    color: BRAND_BLUE,
  });
  // Kaki kanan 'V' naik ke kanan atas (Gelap #1f2937)
  page.drawLine({
    start: { x: x + 23, y: baseY + 2 },
    end: { x: x + 35, y: topY - 6 },
    thickness: 3.4,
    color: TEXT_DARK,
  });
}

/**
 * Menggambar kotak berbingkai sudut membulat dengan SVG path.
 */
export function drawRoundedRect(
  page: PDFPage,
  x: number,
  topY: number,
  width: number,
  height: number,
  radius: number,
  options?: {
    borderColor?: RGB;
    borderWidth?: number;
    color?: RGB;
  },
) {
  if (radius <= 0) {
    page.drawRectangle({
      x,
      y: topY - height,
      width,
      height,
      borderColor: options?.borderColor,
      borderWidth: options?.borderWidth,
      color: options?.color,
    });
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  const w = width;
  const h = height;
  const d = `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
  page.drawSvgPath(d, {
    x,
    y: topY,
    borderColor: options?.borderColor,
    borderWidth: options?.borderWidth,
    color: options?.color,
  });
}
