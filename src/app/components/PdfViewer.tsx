"use client"; // must be first line

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// Use CDN worker to avoid SSR issues
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PdfViewer() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="border p-2 mb-4"
      />

      {file && (
        <div>
          <Document
            file={file}
            onLoadError={(error) => console.error("PDF load error:", error)}
          >
            <Page pageNumber={1} />
          </Document>
        </div>
      )}
    </div>
  );
}
