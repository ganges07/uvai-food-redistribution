import { ArrowLeft, Smartphone, Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui';

const PUBLISHED_URL = 'https://smart-food-redistrib-ff0i.bolt.host/';

export function QRCodeScreen({ onBack }: { onBack: () => void }) {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(PUBLISHED_URL)}`;

  async function handleDownload() {
    try {
      const res = await fetch(qrImageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'uvai-qr-code.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(qrImageUrl, '_blank');
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'UVAI App',
          text: 'Scan to open the UVAI food redistribution app',
          url: PUBLISHED_URL,
        });
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(PUBLISHED_URL);
    }
  }

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Scan to Open App</h1>
      </div>

      <div className="flex flex-col items-center">
        {/* QR Code card */}
        <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100 mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white font-bold text-sm">
              U
            </div>
            <span className="font-bold text-gray-900 text-lg">UVAI</span>
          </div>

          <div className="bg-white p-3 rounded-2xl border-2 border-orange-100">
            <img
              src={qrImageUrl}
              alt="QR code for UVAI app"
              className="w-64 h-64 mx-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const fallback = (e.target as HTMLImageElement).nextElementSibling;
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
            <div className="hidden text-center text-sm text-gray-500 py-20">
              QR code unavailable.
              <br />
              Visit: {PUBLISHED_URL}
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4 flex items-center justify-center gap-1.5">
            <Smartphone className="h-4 w-4 text-orange-600" />
            Scan with your phone camera
          </p>
        </div>

        {/* URL display */}
        <div className="w-full bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-400 text-center mb-1">Published Link</p>
          <p className="text-sm font-medium text-orange-600 text-center break-all">{PUBLISHED_URL}</p>
        </div>

        {/* Actions */}
        <div className="w-full grid grid-cols-2 gap-3">
          <Button variant="outline" fullWidth onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Save QR
          </Button>
          <Button fullWidth onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
        </div>

        {/* Instructions */}
        <div className="w-full mt-6 bg-orange-50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-orange-800">How to use:</p>
          <ol className="text-xs text-orange-700 space-y-1.5 list-decimal list-inside">
            <li>Save the QR code image using "Save QR" button above.</li>
            <li>Add it to your assignment submission alongside the published link.</li>
            <li>Jury members can scan it with their phone camera to open the app directly.</li>
            <li>Make sure you've clicked "Update" in Publish so the latest version is live.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
