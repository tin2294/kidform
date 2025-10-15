'use client';

import { useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';

interface PdfField {
    id: string;
    page: number;
    x: number;
    y: number;
    width: number;
    value: string;
}

interface PdfViewerProps {
    url: string;
    scale?: number;
}

export default function PdfViewer({ url, scale = 1.2 }: PdfViewerProps) {
    const [numPages, setNumPages] = useState(0);
    const [fields, setFields] = useState<PdfField[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasesRef = useRef<HTMLCanvasElement[]>([]);
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
            canvasesRef.current = [];
            renderTasks.current = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) continue;

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvas.style.display = 'block';
                canvas.style.marginBottom = '20px';
                container.appendChild(canvas);
                canvasesRef.current.push(canvas);

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

    const addField = (page: number, x: number, y: number) => {
        const newField: PdfField = {
            id: crypto.randomUUID(),
            page,
            x,
            y,
            width: 150,
            value: '',
        };
        setFields(prev => [...prev, newField]);
    };

    const handleFieldChange = (id: string, value: string) => {
        setFields(prev => prev.map(f => (f.id === id ? { ...f, value } : f)));
    };

    return (
        <div style={{ position: 'relative' }}>
            <div ref={containerRef} style={{ position: 'relative' }} />

            {fields.map(f => {
                const canvas = canvasesRef.current[f.page - 1];
                if (!canvas) return null;

                return (
                    <Rnd
                        key={f.id}
                        bounds="parent"
                        size={{ width: f.width, height: 30 }}
                        position={{ x: f.x, y: f.y }}
                        onDragStop={(e, d) => setFields(prev =>
                            prev.map(field =>
                                field.id === f.id ? { ...field, x: d.x, y: d.y } : field
                            )
                        )}
                        onResizeStop={(e, dir, ref, delta, position) => {
                            setFields(prev =>
                                prev.map(field =>
                                    field.id === f.id
                                        ? {
                                              ...field,
                                              width: parseInt(ref.style.width),
                                              ...position,
                                          }
                                        : field
                                )
                            );
                        }}
                    >
                        <input
                            value={f.value}
                            onChange={e => handleFieldChange(f.id, e.target.value)}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: '1px solid #000',
                                background: 'rgba(255,255,255,0.8)',
                                padding: '2px 4px',
                                boxSizing: 'border-box',
                                fontSize: '14px',
                            }}
                        />
                    </Rnd>
                );
            })}

            <div style={{ marginTop: '20px' }}>
                {Array.from({ length: numPages }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => addField(i + 1, 50, 50)}
                        style={{ marginRight: '10px' }}
                    >
                        Add field on page {i + 1}
                    </button>
                ))}
            </div>
        </div>
    );
}
