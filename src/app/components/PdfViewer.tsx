'use client';

import { useEffect, useRef, useState } from 'react';

interface PdfViewerProps {
    url: string;
    scale?: number;
}

export default function PdfViewer({ url, scale = 1.2 }: PdfViewerProps) {
    const [numPages, setNumPages] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const renderTasks = useRef<any[]>([]);

    useEffect(() => {
        const renderPdf = async () => {
            const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
            await import('pdfjs-dist/build/pdf.worker.entry');

            const pdf = await pdfjsLib.getDocument(url).promise;
            setNumPages(pdf.numPages);

            const container = containerRef.current;
            if (!container) return;
            container.innerHTML = '';
            renderTasks.current = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) continue;

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                container.appendChild(canvas);

                const renderTask = page.render({ canvasContext: ctx, viewport });
                renderTasks.current.push(renderTask);

                try {
                    await renderTask.promise;
                } catch (err) {
                    if ((err as any).name === 'RenderingCancelledException') continue;
                    console.error(err);
                }
            }
        };

        renderPdf();

        return () => {
            renderTasks.current.forEach(task => task?.cancel?.());
            renderTasks.current = [];
        };
    }, [url, scale]);

    return <div ref={containerRef} style={{ overflowY: 'auto', maxHeight: '80vh' }} />;
}
