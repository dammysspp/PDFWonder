# MakeMePDF Pro Studio 📑✨

A high-performance, private, client-side PDF studio built with React, TypeScript, Tailwind CSS, pdf-lib, and PDF.js.

Merge multiple PDFs, mix with images (PNG, JPG, WebP), crop, rotate, annotate, draw, and auto-scale your document pages—100% inside your browser. No files are ever sent to an external server.

---

## 🚀 Features

- **Multi-File PDF & Image Merging:** Combine multiple PDF documents with JPG, PNG, or WebP images into one unified document.
- **Auto-Scale & Margin Alignment:** Automatically center and normalize arbitrary image resolutions and different PDF sheets onto standard A4 canvases or match your document's first page.
- **Interactive Crop Tool:** Select and crop regions directly inside the page editor.
- **Page Annotation & Drawing Studio:**
  - Freehand sketch/pencil with custom colors and line width
  - Semi-transparent text highlighter
  - Box / Rectangular outlines & redaction fills
  - Click-to-add custom text stamps
  - Undo and clear controls
- **Individual & Bulk Rotation:** Rotate pages 90° clockwise or counter-clockwise individually or in bulk.
- **Drag-and-Drop Reordering:** Move pages seamlessly into any desired order with live drag-and-drop feedback.
- **Light & Dark Mode:** Auto-detects system preferences and includes an instant manual toggle switch.
- **100% Private & Serverless:** All computations happen locally on the user's device.

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
git clone https://github.com/<your-username>/PDFWonder.git
cd PDFWonder
npm install
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

---

## 🌐 Deploy to GitHub Pages (Automated)

This repository includes a ready-to-use GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of MakeMePDF Pro Studio"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. In your GitHub repository, navigate to **Settings** → **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. Every push to `main` will automatically build and publish your web app live!
