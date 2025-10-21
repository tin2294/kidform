'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import ConsentModal from '../components/ConsentModal';

const PdfViewer = dynamic(() => import('../components/PdfViewer'), { ssr: false });

export default function PDFTestPage() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [signerEmail, setSignerEmail] = useState('');

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
    <div>
      <input type="file" accept="application/pdf" onChange={handleUpload} />
      {pdfUrl && signerEmail && <PdfViewer url={pdfUrl} signerEmail={signerEmail} />}
      {showConsent && <ConsentModal onAgree={handleConsentAgree} onClose={() => setShowConsent(false)} />}
    </div>
  );
}
