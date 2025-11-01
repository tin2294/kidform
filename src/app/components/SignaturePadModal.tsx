'use client';

import { useEffect, useRef } from 'react';
import SignaturePad from 'signature_pad';

interface SignaturePadModalProps {
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

export default function SignaturePadModal({ onSave, onClose }: SignaturePadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigPadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const pad = new SignaturePad(canvasRef.current, {
        backgroundColor: 'white',
        penColor: 'black',
      });
      sigPadRef.current = pad;
    }
    return () => sigPadRef.current?.off();
  }, []);

  const handleSave = () => {
    const dataUrl = sigPadRef.current?.toDataURL();
    if (dataUrl) onSave(dataUrl);
  };

  const handleClear = () => sigPadRef.current?.clear();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold mb-2">Draw your signature</h2>
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="border border-gray-400 rounded-md mb-2"
        />
        <div className="flex justify-end gap-3">
          <button onClick={handleClear} className="px-3 py-1 border rounded">Clear</button>
          <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
        </div>
      </div>
    </div>
  );
}
