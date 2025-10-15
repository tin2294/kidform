'use client';

import { useState } from 'react';

export default function PDFViewer() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const res = await fetch('/upload', { method: 'POST', body: arrayBuffer });
    const data = await res.json();
    setPdfUrl(data.filePath);
  };

  return (
    <div style={{ padding: 20 }}>
      <input type="file" accept="application/pdf" onChange={handleUpload} />
      {pdfUrl && (
        <iframe
          src={pdfUrl}
          width="100%"
          height="600px"
          style={{ border: '1px solid #ccc', marginTop: 20 }}
        />
      )}
    </div>
  );
}
