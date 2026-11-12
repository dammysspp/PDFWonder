import * as pdfjsLib from 'pdfjs-dist';

// Point to cdn worker matching pdfjs version
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export async function renderPdfPageToDataUrl(
  pdfData: Uint8Array,
  pageIndex: number, // 0-based
  scale: number = 1.5
): Promise<{ dataUrl: string; width: number; height: number }> {
  // Use a copy to prevent detached array buffer errors
  const copy = pdfData.slice(0);
  const loadingTask = pdfjsLib.getDocument({ data: copy });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageIndex + 1);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // In pdfjs-dist v4+, canvas is also accepted/required in RenderParameters
  await page.render({
    canvasContext: ctx,
    viewport: viewport,
    canvas: canvas,
  } as any).promise;

  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  return {
    dataUrl,
    width: viewport.width / scale,
    height: viewport.height / scale,
  };
}

export async function getPdfPageCount(pdfData: Uint8Array): Promise<number> {
  const copy = pdfData.slice(0);
  const loadingTask = pdfjsLib.getDocument({ data: copy });
  const pdfDoc = await loadingTask.promise;
  return pdfDoc.numPages;
}

export async function renderImageFileToDataUrl(
  file: File | Blob
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          dataUrl,
          width: img.naturalWidth || 600,
          height: img.naturalHeight || 800,
        });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
