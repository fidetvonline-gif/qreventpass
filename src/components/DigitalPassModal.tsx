import React, { useEffect, useState, useRef } from 'react';
import { X, Download, Printer, CheckCircle, Shield, Building, MapPin, Calendar, Clock, Copy, Check } from 'lucide-react';
import { Guest, EventItem } from '../types';
import { generateQRDataUrl } from '../services/qr';

interface DigitalPassModalProps {
  guest: Guest | null;
  event: EventItem | undefined;
  onClose: () => void;
}

export const DigitalPassModal: React.FC<DigitalPassModalProps> = ({ guest, event, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const passCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (guest?.qr_token) {
      generateQRDataUrl(guest.qr_token, 380)
        .then(setQrDataUrl)
        .catch(err => console.error('Error generating QR:', err));
    }
  }, [guest]);

  if (!guest || !event) return null;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(guest.qr_token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    // Create a temporary canvas or direct image download of the QR pass
    const link = document.createElement('a');
    link.download = `EventPass-${guest.full_name.replace(/\s+/g, '_')}-${guest.reference_number}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'VIP':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Speaker':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Government Official':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Media':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      case 'Staff':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'Partner':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md my-6 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:m-0">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm tracking-wide">DIGITAL GUEST PASS</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Pass Card */}
        <div ref={passCardRef} className="p-6 bg-white print:p-4">
          {/* Top Brand & Event Venue */}
          <div className="text-center pb-4 border-b border-slate-100">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-2">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <span>Godswill Akpabio Event Centre</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              {event.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Official Authentication Pass & Invitation</p>
          </div>

          {/* Attendee Details */}
          <div className="mt-4 text-center">
            <span
              className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border mb-2 ${getCategoryColor(
                guest.category
              )}`}
            >
              {guest.category} ACCESS
            </span>
            <h4 className="text-xl font-extrabold text-slate-900">{guest.full_name}</h4>
            <p className="text-xs text-slate-600 mt-0.5">{guest.organization || 'Invited Attendee'}</p>
          </div>

          {/* QR Code Container */}
          <div className="my-5 flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
            {qrDataUrl ? (
              <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${guest.full_name}`}
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                />
              </div>
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                Generating QR code...
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-widest text-slate-800 bg-white px-3 py-1 rounded-md border border-slate-200 shadow-2xs">
                {guest.qr_token}
              </span>
              <button
                onClick={handleCopyToken}
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors print:hidden"
                title="Copy Token"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Present this QR code at entrance scanner</p>
          </div>

          {/* Event & Check-in Details */}
          <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-slate-900">Date: </span>
                {new Date(event.event_date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-slate-900">Time: </span>
                {event.start_time} - {event.end_time}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-slate-900">Venue: </span>
                {event.venue}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
              <span className="text-slate-500 font-mono text-[11px]">Ref: {guest.reference_number}</span>
              <div className="flex items-center gap-1 text-[11px] font-semibold">
                {guest.check_in_status === 'checked_in' ? (
                  <span className="text-emerald-700 inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle className="w-3 h-3" /> Checked In
                  </span>
                ) : (
                  <span className="text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                    Awaiting Entry
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <button
            onClick={handleDownload}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download QR</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Pass</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
