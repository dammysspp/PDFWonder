import { PDFDocument, degrees } from 'pdf-lib';
import type { PDFPageItem, LoadedFile, PageAnnotation, PageScaleMode } from '../types';

// Standard A4 dimensions in PDF points (72 DPI): 595.28 x 841.89
export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;

/**
 * Render annotations directly onto an image canvas and return JPEG bytes
 */
async function renderPageWithAnnotationsToImageBytes(
  baseDataUrl: string,
  annotations: PageAnnotation[],
  targetWidth: number,
  targetHeight: number
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context failed'));

      // Draw original background image
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Render annotations
      for (const ann of annotations) {
        if (ann.type === 'drawing' && ann.points && ann.points.length > 0) {
          ctx.strokeStyle = ann.color;
          ctx.lineWidth = ann.strokeWidth || 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          const first = ann.points[0];
          ctx.moveTo(first.x * targetWidth, first.y * targetHeight);
          for (let i = 1; i < ann.points.length; i++) {
            ctx.lineTo(ann.points[i].x * targetWidth, ann.points[i].y * targetHeight);
          }
          ctx.stroke();
        } else if (ann.type === 'highlight' && ann.width && ann.height) {
          ctx.save();
          ctx.fillStyle = ann.color;
          ctx.globalAlpha = 0.45;
          ctx.fillRect(
            ann.x * targetWidth,
            ann.y * targetHeight,
            ann.width * targetWidth,
            ann.height * targetHeight
          );
          ctx.restore();
        } else if (ann.type === 'rectangle' && ann.width && ann.height) {
          ctx.strokeStyle = ann.color;
          ctx.lineWidth = ann.strokeWidth || 3;
          if (ann.fill) {
            ctx.fillStyle = ann.color;
            ctx.fillRect(
              ann.x * targetWidth,
              ann.y * targetHeight,
              ann.width * targetWidth,
              ann.height * targetHeight
            );
          } else {
            ctx.strokeRect(
              ann.x * targetWidth,
              ann.y * targetHeight,
              ann.width * targetWidth,
              ann.height * targetHeight
            );
          }
        } else if (ann.type === 'text' && ann.text) {
          ctx.font = `${(ann.fontSize || 18) * (targetWidth / 600)}px sans-serif`;
          ctx.fillStyle = ann.color;
          ctx.fillText(ann.text, ann.x * targetWidth, (ann.y * targetHeight) + ((ann.fontSize || 18) * (targetWidth / 600)));
        }
      }

      canvas.toBlob(
        async (blob) => {
          if (!blob) return reject(new Error('Canvas blob export failed'));
          const buffer = await blob.arrayBuffer();
          resolve(new Uint8Array(buffer));
        },
        'image/jpeg',
        0.92
      );
    };
    img.onerror = (e) => reject(e);
    img.src = baseDataUrl;
  });
}

/**
 * Calculates fit dimension (letterboxing) to center an item within a target canvas without stretching or cropping.
 */
function calculateFittedBox(
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number,
  paddingPercent: number = 0.04
) {
  const maxW = targetWidth * (1 - paddingPercent * 2);
  const maxH = targetHeight * (1 - paddingPercent * 2);
  const scale = Math.min(maxW / srcWidth, maxH / srcHeight, 1.0); // Don't upscale tiny icons beyond 1.0 unless needed

  const fittedWidth = srcWidth * scale;
  const fittedHeight = srcHeight * scale;
  const x = (targetWidth - fittedWidth) / 2;
  const y = (targetHeight - fittedHeight) / 2;

  return { x, y, width: fittedWidth, height: fittedHeight, scale };
}

/**
 * Builds the merged & edited PDF using pdf-lib with optional Auto-Scaling.
 */
export async function generateExportPdf(
  pages: PDFPageItem[],
  filesMap: Map<string, LoadedFile>,
  scaleMode: PageScaleMode = 'fit_a4',
  onProgress?: (progress: number, statusText: string) => void
): Promise<Uint8Array> {
  const finalPdfDoc = await PDFDocument.create();
  const parsedPdfDocCache = new Map<string, PDFDocument>();

  // Determine standard reference page target
  let standardTargetW = A4_WIDTH;
  let standardTargetH = A4_HEIGHT;

  if (scaleMode === 'fit_first_page' && pages.length > 0) {
    const firstP = pages[0];
    const isRotated = firstP.rotation === 90 || firstP.rotation === 270;
    standardTargetW = isRotated ? firstP.height : firstP.width;
    standardTargetH = isRotated ? firstP.width : firstP.height;
  }

  for (let i = 0; i < pages.length; i++) {
    const pageItem = pages[i];
    if (onProgress) {
      onProgress(
        Math.round(((i + 1) / pages.length) * 100),
        `Processing page ${i + 1} of ${pages.length}...`
      );
    }

    const file = filesMap.get(pageItem.sourceFileId);
    if (!file) continue;

    const isPageRotated = pageItem.rotation === 90 || pageItem.rotation === 270;
    const effectiveTargetW = isPageRotated ? standardTargetH : standardTargetW;
    const effectiveTargetH = isPageRotated ? standardTargetW : standardTargetH;

    // 1. IF page was annotated, cropped, or edited:
    if (pageItem.isEdited || (pageItem.annotations && pageItem.annotations.length > 0)) {
      const renderW = Math.max(pageItem.width * 2, 1400);
      const renderH = Math.max(pageItem.height * 2, 1800);
      const annotatedImgBytes = await renderPageWithAnnotationsToImageBytes(
        pageItem.thumbnailUrl,
        pageItem.annotations || [],
        renderW,
        renderH
      );

      const embeddedImg = await finalPdfDoc.embedJpg(annotatedImgBytes);

      if (scaleMode === 'original') {
        const newPage = finalPdfDoc.addPage([pageItem.width, pageItem.height]);
        newPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: pageItem.width,
          height: pageItem.height,
        });
        if (pageItem.rotation !== 0) newPage.setRotation(degrees(pageItem.rotation));
      } else {
        // Auto-scale into aligned standard page
        const newPage = finalPdfDoc.addPage([effectiveTargetW, effectiveTargetH]);
        const fit = calculateFittedBox(pageItem.width, pageItem.height, effectiveTargetW, effectiveTargetH, 0.03);
        newPage.drawImage(embeddedImg, {
          x: fit.x,
          y: fit.y,
          width: fit.width,
          height: fit.height,
        });
        if (pageItem.rotation !== 0) newPage.setRotation(degrees(pageItem.rotation));
      }
      continue;
    }

    // 2. NORMAL PDF PAGE (Clean vector PDF page)
    if (pageItem.sourceType === 'pdf' && file.pdfBytes) {
      let srcDoc = parsedPdfDocCache.get(file.id);
      if (!srcDoc) {
        srcDoc = await PDFDocument.load(file.pdfBytes.slice(0));
        parsedPdfDocCache.set(file.id, srcDoc);
      }

      if (scaleMode === 'original') {
        const [copiedPage] = await finalPdfDoc.copyPages(srcDoc, [pageItem.sourcePageIndex]);
        const currentRot = copiedPage.getRotation().angle || 0;
        copiedPage.setRotation(degrees((currentRot + pageItem.rotation) % 360));
        finalPdfDoc.addPage(copiedPage);
      } else {
        // Embed the copied PDF page as an XObject/page into an aligned standard canvas
        const [embeddedPage] = await finalPdfDoc.embedPages([srcDoc.getPage(pageItem.sourcePageIndex)]);
        const newPage = finalPdfDoc.addPage([effectiveTargetW, effectiveTargetH]);
        
        const fit = calculateFittedBox(pageItem.width, pageItem.height, effectiveTargetW, effectiveTargetH, 0);
        newPage.drawPage(embeddedPage, {
          x: fit.x,
          y: fit.y,
          width: fit.width,
          height: fit.height,
        });

        if (pageItem.rotation !== 0) {
          newPage.setRotation(degrees(pageItem.rotation));
        }
      }
    } else if (pageItem.sourceType === 'image') {
      // 3. IMAGE PAGE (Auto-fit into standard document canvas so it aligns with PDFs)
      const isPng = file.type.includes('png');
      let embeddedImage;

      if (file.imageBlob) {
        const imgBuffer = await file.imageBlob.arrayBuffer();
        if (isPng) {
          try {
            embeddedImage = await finalPdfDoc.embedPng(imgBuffer);
          } catch {
            embeddedImage = await finalPdfDoc.embedJpg(imgBuffer);
          }
        } else {
          try {
            embeddedImage = await finalPdfDoc.embedJpg(imgBuffer);
          } catch {
            embeddedImage = await finalPdfDoc.embedPng(imgBuffer);
          }
        }
      } else {
        const res = await fetch(pageItem.thumbnailUrl);
        const buffer = await res.arrayBuffer();
        embeddedImage = await finalPdfDoc.embedJpg(buffer);
      }

      if (scaleMode === 'original') {
        const newPage = finalPdfDoc.addPage([pageItem.width, pageItem.height]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: pageItem.width,
          height: pageItem.height,
        });
        if (pageItem.rotation !== 0) newPage.setRotation(degrees(pageItem.rotation));
      } else {
        // Auto-scale image to fit standard page (e.g. A4) with clean margin alignment
        const newPage = finalPdfDoc.addPage([effectiveTargetW, effectiveTargetH]);
        const fit = calculateFittedBox(pageItem.width, pageItem.height, effectiveTargetW, effectiveTargetH, 0.04);

        newPage.drawImage(embeddedImage, {
          x: fit.x,
          y: fit.y,
          width: fit.width,
          height: fit.height,
        });

        if (pageItem.rotation !== 0) newPage.setRotation(degrees(pageItem.rotation));
      }
    }
  }

  return await finalPdfDoc.save();
}

/**
 * Download bytes as a file in browser
 */
export function downloadPdf(bytes: Uint8Array, filename: string = 'PDFWonder_Merged.pdf') {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
