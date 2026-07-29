import { useState, useRef, useEffect } from 'react';
import { X, PenTool, Type, Check, RotateCcw, ShieldCheck } from 'lucide-react';
import { Button } from '../ui';

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  invoiceNumber: string;
  documentType: 'invoice' | 'proposal' | 'quote';
  customerName: string;
  totalAmountFormatted: string;
  onConfirmSign: (data: { signerName: string; signerEmail: string; signatureData: string }) => Promise<void>;
}

export function SignatureModal({
  open,
  onClose,
  invoiceNumber,
  documentType,
  customerName,
  totalAmountFormatted,
  onConfirmSign,
}: SignatureModalProps) {
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [signerName, setSignerName] = useState(customerName || '');
  const [signerEmail, setSignerEmail] = useState('');
  const [typedFont, setTypedFont] = useState<'cursive' | 'serif' | 'sans'>('cursive');
  const [agreed, setAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Canvas ref for drawing signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (open) {
      setSignerName(customerName || '');
      setAgreed(false);
      setError(null);
      setHasDrawn(false);
    }
  }, [open, customerName]);

  // Setup canvas when opened or mode changed
  useEffect(() => {
    if (open && mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1e1b4b'; // Deep violet-black
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [open, mode]);

  if (!open) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawn(false);
  };

  const generateTypedSignatureDataUrl = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 100);
      ctx.fillStyle = '#1e1b4b';
      
      if (typedFont === 'cursive') {
        ctx.font = 'italic 32px "Brush Script MT", "Caveat", "Dancing Script", cursive';
      } else if (typedFont === 'serif') {
        ctx.font = 'italic 30px Georgia, serif';
      } else {
        ctx.font = 'bold 28px sans-serif';
      }
      
      ctx.fillText(signerName || 'Signature', 30, 60);
      // Underline accent
      ctx.beginPath();
      ctx.strokeStyle = '#4338ca';
      ctx.lineWidth = 2;
      ctx.moveTo(25, 75);
      ctx.lineTo(370, 75);
      ctx.stroke();
    }
    return canvas.toDataURL('image/png');
  };

  const handleSubmit = async () => {
    setError(null);
    if (!signerName.trim()) {
      setError('Please enter your full legal name.');
      return;
    }
    if (!agreed) {
      setError('Please check the confirmation box to proceed.');
      return;
    }

    let signatureDataUrl = '';

    if (mode === 'draw') {
      if (!hasDrawn || !canvasRef.current) {
        setError('Please draw your signature in the box provided.');
        return;
      }
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    } else {
      signatureDataUrl = generateTypedSignatureDataUrl();
    }

    setIsSigning(true);
    try {
      await onConfirmSign({
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim(),
        signatureData: signatureDataUrl,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process signature');
    } finally {
      setIsSigning(false);
    }
  };

  const docLabel = documentType === 'proposal' ? 'Proposal' : documentType === 'quote' ? 'Quote' : 'Invoice';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Approve & Sign {docLabel}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                #{invoiceNumber} · {totalAmountFormatted}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Signer inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Full Legal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="e.g. jane@company.com"
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Mode Switcher */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Digital Signature Method
              </label>
              <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setMode('draw')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                    mode === 'draw'
                      ? 'bg-white dark:bg-gray-900 text-violet-600 dark:text-violet-400 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" /> Draw
                </button>
                <button
                  type="button"
                  onClick={() => setMode('type')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                    mode === 'type'
                      ? 'bg-white dark:bg-gray-900 text-violet-600 dark:text-violet-400 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" /> Type
                </button>
              </div>
            </div>

            {mode === 'draw' ? (
              <div className="space-y-1.5">
                <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/40 p-1 flex justify-center items-center">
                  <canvas
                    ref={canvasRef}
                    width={420}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-28 cursor-crosshair touch-none rounded-lg bg-white"
                  />
                  {!hasDrawn && (
                    <div className="absolute pointer-events-none text-xs text-gray-400 flex items-center gap-1.5">
                      <PenTool className="w-4 h-4 text-gray-300" /> Draw your signature here using mouse or touch
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear Box
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center min-h-[90px] flex flex-col justify-center items-center shadow-inner">
                  <p
                    className={`text-2xl ${
                      typedFont === 'cursive'
                        ? 'font-serif italic text-indigo-900 dark:text-indigo-200 tracking-wide'
                        : typedFont === 'serif'
                        ? 'font-serif text-gray-900 dark:text-gray-100'
                        : 'font-sans font-bold text-gray-900 dark:text-white'
                    }`}
                  >
                    {signerName || 'Your Signature Name'}
                  </p>
                  <div className="w-48 h-0.5 bg-violet-500/40 mt-1" />
                </div>
                <div className="flex items-center justify-center gap-2 text-xs">
                  <span className="text-gray-400">Style:</span>
                  {(['cursive', 'serif', 'sans'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setTypedFont(f)}
                      className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                        typedFont === f
                          ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700'
                          : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Legal consent checkbox */}
          <div className="p-3.5 bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 rounded-xl text-xs space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                I, <strong className="text-violet-700 dark:text-violet-300">{signerName || 'the client'}</strong>, confirm that I have reviewed {docLabel} #{invoiceNumber} for <strong>{totalAmountFormatted}</strong> and hereby approve and accept its terms digitally.
              </span>
            </label>
          </div>

          {error && <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50/30 dark:bg-gray-800/20">
          <Button variant="ghost" onClick={onClose} disabled={isSigning}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSigning}>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              {isSigning ? 'Signing & Approving...' : `Approve & Sign ${docLabel}`}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
