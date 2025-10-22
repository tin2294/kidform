'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const PdfViewer = dynamic(() => import('../components/PdfViewer'), { ssr: false });
const ConsentModal = dynamic(() => import('../components/ConsentModal'), { ssr: false });
const SignaturePadModal = dynamic(() => import('../components/SignaturePadModal'), { ssr: false });

export default function PDFDashboardPage() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [signerEmail, setSignerEmail] = useState('');
  const [showConsent, setShowConsent] = useState(false);

  // Handle PDF upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const res = await fetch('/upload', { method: 'POST', body: buffer });
    const data = await res.json();
    setPdfUrl(data.filePath);
    setShowConsent(true);
  };

  const handleConsentAgree = (email: string) => {
    setSignerEmail(email);
    setShowConsent(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white p-4 shadow flex justify-between items-center">
        <h1 className="text-xl font-bold">Document Signing Dashboard</h1>
        <div>
          <input type="file" accept="application/pdf" onChange={handleUpload} id="pdf-upload" className="hidden" />
          <label
            htmlFor="pdf-upload"
            className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Upload PDF
          </label>
        </div>
      </header>

      {/* PDF Viewer */}
      <main className="flex-1 overflow-auto p-6">
        {pdfUrl && signerEmail && (
          <PdfViewer
            url={pdfUrl}
            signerEmail={signerEmail}
            scale={1.2}
          />
        )}
      </main>

      {/* Consent Modal */}
      {showConsent && (
        <ConsentModal
          onAgree={handleConsentAgree}
          onClose={() => setShowConsent(false)}
        />
      )}
    </div>
  );
}
