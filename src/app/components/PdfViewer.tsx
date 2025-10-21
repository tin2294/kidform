'use client';

import { useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import dynamic from 'next/dynamic';
import { PDFDocument, rgb } from 'pdf-lib';

const SignaturePadModal = dynamic(() => import('./SignaturePadModal'), { ssr: false });

interface PdfField {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  value: string;
}

interface SignatureField {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
}

interface PdfViewerProps {
  url: string;
  scale?: number;
}

export default function PdfViewer({ url, scale = 1.2 }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [fields, setFields] = useState<PdfField[]>([]);
  const [signatures, setSignatures] = useState<SignatureField[]>([]);
  const [showSigModal, setShowSigModal] = useState(false);
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

  const addSignature = (page: number, x: number, y: number, dataUrl: string) => {
    const newSig: SignatureField = {
      id: crypto.randomUUID(),
      page,
      x,
      y,
      width: 200,
      height: 100,
      dataUrl,
    };
    setSignatures(prev => [...prev, newSig]);
  };

  const handleFieldChange = (id: string, value: string) => {
    setFields(prev => prev.map(f => (f.id === id ? { ...f, value } : f)));
  };

  const handleSignatureSave = (dataUrl: string) => {
    addSignature(1, 50, 50, dataUrl);
    setShowSigModal(false);
  };

  const handleGeneratePdf = async () => {
  try {
      const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      const pages = pdfDoc.getPages();

      // Embed each field value
      fields.forEach(f => {
      const page = pages[f.page - 1];
      const { width, height } = page.getSize();

      page.drawText(f.value || '', {
          x: f.x,
          y: height - f.y - 30, // invert Y coordinate
          size: 12,
          color: rgb(0, 0, 0),
      });
      });

      // Embed signatures (as images)
      for (const sig of signatures) {
      const page = pages[sig.page - 1];
      const { width, height } = page.getSize();

      const pngImage = await pdfDoc.embedPng(sig.dataUrl);
      page.drawImage(pngImage, {
          x: sig.x,
          y: height - sig.y - sig.height,
          width: sig.width,
          height: sig.height,
      });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'filled.pdf';
      a.click();

  } catch (err) {
      console.error('Error generating PDF:', err);
  }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* PDF container */}
      <div ref={containerRef} style={{ position: 'relative' }} />

      {fields.map(f => (
        <Rnd
          key={f.id}
          bounds="parent"
          size={{ width: f.width, height: 30 }}
          position={{ x: f.x, y: f.y }}
          onDragStop={(e, d) =>
            setFields(prev =>
              prev.map(field =>
                field.id === f.id ? { ...field, x: d.x, y: d.y } : field
              )
            )
          }
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
      ))}

      {signatures.map(sig => (
        <Rnd
          key={sig.id}
          bounds="parent"
          size={{ width: sig.width, height: sig.height }}
          position={{ x: sig.x, y: sig.y }}
          onDragStop={(e, d) =>
            setSignatures(prev =>
              prev.map(s =>
                s.id === sig.id ? { ...s, x: d.x, y: d.y } : s
              )
            )
          }
          onResizeStop={(e, dir, ref, delta, position) => {
            setSignatures(prev =>
              prev.map(s =>
                s.id === sig.id
                  ? {
                      ...s,
                      width: parseInt(ref.style.width),
                      height: parseInt(ref.style.height),
                      ...position,
                    }
                  : s
              )
            );
          }}
        >
          <img
            src={sig.dataUrl}
            alt="signature"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              background: 'transparent',
              pointerEvents: 'none',
            }}
          />
        </Rnd>
      ))}

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {Array.from({ length: numPages }, (_, i) => (
          <button
            key={i}
            onClick={() => addField(i + 1, 50, 50)}
            style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '6px' }}
          >
            Add field on page {i + 1}
          </button>
        ))}
        <button
          onClick={() => setShowSigModal(true)}
          style={{
            padding: '6px 10px',
            border: '1px solid #ccc',
            borderRadius: '6px',
            backgroundColor: '#e0f7ff',
          }}
        >
          Add Signature
        </button>
        <button
        onClick={handleGeneratePdf}
        style={{
            padding: '6px 10px',
            border: '1px solid #ccc',
            borderRadius: '6px',
            backgroundColor: '#d1ffd1',
        }}
        >
        Generate PDF
        </button>

      </div>

      {showSigModal && (
        <SignaturePadModal
          onSave={handleSignatureSave}
          onClose={() => setShowSigModal(false)}
        />
      )}
    </div>
  );
}
