'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const PdfViewer = dynamic(() => import('../components/PdfViewer'), { ssr: false });

export default function PDFTestPage() {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const buffer = await file.arrayBuffer();
        const res = await fetch('/upload', { method: 'POST', body: buffer });
        const data = await res.json();

        setPdfUrl(data.filePath);
    };

    return (
        <div>
            <input type="file" accept="application/pdf" onChange={handleUpload} />
            {pdfUrl && <PdfViewer url={pdfUrl} />}
        </div>
    );
}
