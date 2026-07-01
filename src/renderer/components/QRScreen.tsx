import { QRCodeSVG } from 'qrcode.react';

export interface QRScreenProps {
  qr?: string;
}

export function QRScreen({ qr }: QRScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
        {qr ? (
          <QRCodeSVG value={qr} size={256} />
        ) : (
          <div className="w-[256px] h-[256px] flex items-center justify-center text-slate-400">
            Memuat QR Code...
          </div>
        )}
      </div>
      <h2 className="text-2xl text-white font-light mb-4">Gunakan WhatsApp di komputer Anda</h2>
      <ol className="text-wa-textMuted text-sm space-y-4 max-w-sm text-left list-decimal pl-4">
        <li>Buka WhatsApp di telepon Anda</li>
        <li>Ketuk <strong>Menu</strong> di Android, atau <strong>Pengaturan</strong> di iPhone</li>
        <li>Ketuk <strong>Perangkat Taut</strong> dan pilih <strong>Tautkan Perangkat</strong></li>
        <li>Arahkan telepon Anda ke layar ini untuk memindai kode QR</li>
      </ol>
    </div>
  );
}
