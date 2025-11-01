'use client';

import { useState } from "react";

interface ConsentModalProps {
  onAgree: (email: string) => void;
  onClose: () => void;
}

export default function ConsentModal({ onAgree, onClose }: ConsentModalProps) {
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = () => {
    if (!checked || !email) return;
    onAgree(email);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[400px]">
        <h2 className="text-lg font-semibold mb-4">Consent to Electronic Signature</h2>
        <div className="mb-4">
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border p-2 w-full rounded"
          />
        </div>
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
          />
          <span>I consent to sign this document electronically.</span>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!checked || !email}
            className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Agree & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
