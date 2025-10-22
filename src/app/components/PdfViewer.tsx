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
  signerEmail: string;
  scale?: number;
}

export default function PdfViewer({ url, scale = 1.2, signerEmail }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [fields, setFields] = useState<PdfField[]>([]);
  const [signatures, setSignatures] = useState<SignatureField[]>([]);
  const [showSigModal, setShowSigModal] = useState(false);
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
        canvas.style.display = 'block';
        canvas.style.marginBottom = '20px';
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

  const addField = (page: number, x: number, y: number) => {
    const newField: PdfField = { id: crypto.randomUUID(), page, x, y, width: 150, value: '' };
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

      fields.forEach(f => {
        const page = pages[f.page - 1];
        const { width: pdfWidth, height: pdfHeight } = page.getSize();

        const canvas = containerRef.current?.children[f.page - 1] as HTMLCanvasElement;
        if (!canvas) return;
        const scaleX = pdfWidth / canvas.width;
        const scaleY = pdfHeight / canvas.height;

        page.drawText(f.value || '', {
          x: f.x * scaleX,
          y: pdfHeight - f.y * scaleY - 12,
          size: 12,
          color: rgb(0, 0, 0),
        });
      });

      for (const sig of signatures) {
        const page = pages[sig.page - 1];
        const { width: pdfWidth, height: pdfHeight } = page.getSize();

        const canvas = containerRef.current?.children[sig.page - 1] as HTMLCanvasElement;
        if (!canvas) return;
        const scaleX = pdfWidth / canvas.width;
        const scaleY = pdfHeight / canvas.height;

        const pngImage = await pdfDoc.embedPng(sig.dataUrl);
        page.drawImage(pngImage, {
          x: sig.x * scaleX,
          y: pdfHeight - sig.y * scaleY - sig.height * scaleY,
          width: sig.width * scaleX,
          height: sig.height * scaleY,
        });
      }

      const page = pages[0];
      const { height: pdfHeight } = page.getSize();
      page.drawText(`Signed by: ${signerEmail}`, { x: 50, y: pdfHeight - 50, size: 10, color: rgb(0, 0, 0) });
      page.drawText(`Consent given: ${new Date().toISOString()}`, { x: 50, y: pdfHeight - 65, size: 10, color: rgb(0, 0, 0) });
      page.drawText(`Fields & signatures included`, { x: 50, y: pdfHeight - 80, size: 10, color: rgb(0, 0, 0) });

      const pdfBytes = await pdfDoc.save();

      const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(pdfBytes));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      console.log('PDF SHA-256 hash:', hashHex);

      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'filled.pdf';
      a.click();

      const auditRecord = {
        signerEmail,
        timestamp: new Date().toISOString(),
        documentHash: hashHex,
        fieldsCount: fields.length,
        signaturesCount: signatures.length,
        userAgent: navigator.userAgent,
      };
      console.log('Audit record:', auditRecord);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Actions */}
      <div className="w-64 bg-white p-4 shadow-md flex-shrink-0">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>
        <div className="flex flex-col gap-3">
          {Array.from({ length: numPages }, (_, i) => (
            <button
              key={i}
              onClick={() => addField(i + 1, 50, 50)}
              className="px-3 py-2 border rounded hover:bg-gray-100"
            >
              Add field on page {i + 1}
            </button>
          ))}
          <button
            onClick={() => setShowSigModal(true)}
            className="px-3 py-2 border rounded bg-blue-50 hover:bg-blue-100"
          >
            Add Signature
          </button>
          <button
            onClick={handleGeneratePdf}
            className="px-3 py-2 border rounded bg-green-50 hover:bg-green-100"
          >
            Generate PDF
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto p-4 relative">
        <div ref={containerRef} />
        {fields.map(f => (
          <Rnd
            key={f.id}
            bounds="parent"
            size={{ width: f.width, height: 30 }}
            position={{ x: f.x, y: f.y }}
            onDragStop={(e, d) => setFields(prev => prev.map(field => field.id === f.id ? { ...field, x: d.x, y: d.y } : field))}
            onResizeStop={(e, dir, ref, delta, position) =>
              setFields(prev => prev.map(field => field.id === f.id ? { ...field, width: parseInt(ref.style.width), ...position } : field))
            }
          >
            <input
              value={f.value}
              onChange={e => handleFieldChange(f.id, e.target.value)}
              className="w-full h-full border border-black bg-white/80 p-1 text-sm"
            />
          </Rnd>
        ))}
        {signatures.map(sig => (
          <Rnd
            key={sig.id}
            bounds="parent"
            size={{ width: sig.width, height: sig.height }}
            position={{ x: sig.x, y: sig.y }}
            onDragStop={(e, d) => setSignatures(prev => prev.map(s => s.id === sig.id ? { ...s, x: d.x, y: d.y } : s))}
            onResizeStop={(e, dir, ref, delta, position) =>
              setSignatures(prev => prev.map(s => s.id === sig.id ? { ...s, width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...position } : s))
            }
          >
            <img src={sig.dataUrl} alt="signature" className="w-full h-full object-contain pointer-events-none" />
          </Rnd>
        ))}
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
