import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Zap, 
  Clock, 
  UserCheck, 
  ArrowRight,
  ShieldCheck,
  Building,
  KeyRound
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { storage } from '../services/storage';
import { playSuccessSound, playErrorSound } from '../services/sound';
import { generateToken, generateReferenceNumber } from '../services/qr';
import { Gate, VerificationResult, AttendanceLog, EventItem, Guest } from '../types';

interface ScannerProps {
  event: EventItem | undefined;
  staffName?: string;
  defaultGateId?: string;
}

export const Scanner: React.FC<ScannerProps> = ({ 
  event, 
  staffName = 'Security Staff',
  defaultGateId
}) => {
  const [gates, setGates] = useState<Gate[]>([]);
  const [selectedGateId, setSelectedGateId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState<string>('');
  const [lastResult, setLastResult] = useState<VerificationResult | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [recentScans, setRecentScans] = useState<AttendanceLog[]>([]);
  const [availableGuests, setAvailableGuests] = useState<Guest[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-container';

  // Create a quick test guest pass if roster is empty
  const handleCreateQuickTestGuest = () => {
    if (!event) return;
    const testGuest: Guest = {
      id: `gst-${Date.now()}`,
      event_id: event.id,
      full_name: 'Dr. John Umoh (Test VIP)',
      email: 'john.umoh@example.com',
      phone: '+234 803 123 4567',
      organization: 'Godswill Akpabio Event Centre Delegation',
      category: 'VIP',
      reference_number: generateReferenceNumber(),
      qr_token: generateToken(),
      is_active: true,
      check_in_status: 'pending',
      check_in_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    storage.saveGuest(testGuest);
    refreshData();
    processToken(testGuest.qr_token);
  };

  // Quick test targets derived from real registered guests
  const activeGuest = availableGuests.find(g => g.is_active && g.check_in_status !== 'checked_in') || availableGuests[0];
  const checkedInGuest = availableGuests.find(g => g.check_in_status === 'checked_in') || availableGuests[0];
  const disabledGuest = availableGuests.find(g => !g.is_active) || availableGuests[0];

  // Load gates, guests, and recent scans
  const refreshData = () => {
    if (!event) return;
    const g = storage.getGates(event.id);
    setGates(g);
    if (!selectedGateId && g.length > 0) {
      const match = defaultGateId ? g.find(item => item.id === defaultGateId) : null;
      setSelectedGateId(match ? match.id : g[0].id);
    }
    setRecentScans(storage.getAttendanceLogs(event.id).slice(0, 8));
    setAvailableGuests(storage.getGuests(event.id));
  };

  useEffect(() => {
    refreshData();
    const handleUpdate = () => refreshData();
    window.addEventListener('eventpass:data_updated', handleUpdate);
    return () => window.removeEventListener('eventpass:data_updated', handleUpdate);
  }, [event, defaultGateId]);

  // Handle Token Verification
  const processToken = (tokenStr: string) => {
    if (!tokenStr.trim() || isProcessing) return;
    setIsProcessing(true);

    const result = storage.verifyAndCheckIn(
      tokenStr.trim(),
      selectedGateId,
      staffName,
      'WebCam/Mobile Scanner'
    );

    setLastResult(result);

    if (soundEnabled) {
      if (result.status === 'valid') {
        playSuccessSound();
      } else {
        playErrorSound();
      }
    }

    refreshData();
    setIsProcessing(false);
  };

  // Start Camera Scanning via html5-qrcode
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' }, // Prefer rear camera on mobile
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          // On successful decode
          processToken(decodedText);
          // Pause briefly to avoid rapid duplicate firing
          if (html5QrCodeRef.current?.isScanning) {
            html5QrCodeRef.current.pause();
            setTimeout(() => {
              if (html5QrCodeRef.current?.isScanning) {
                html5QrCodeRef.current.resume();
              }
            }, 2500);
          }
        },
        () => {
          // Frame scan error (ignore, standard frame noise)
        }
      );
      setIsScanning(true);
    } catch (err: unknown) {
      console.warn('Camera start error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(
        msg.includes('Permission') || msg.includes('NotAllowedError')
          ? 'Camera permission was denied. Please allow camera access in browser settings or use the manual token tester below.'
          : 'Could not initialize camera. If running inside a sandboxed frame, use the Quick Test scan buttons or manual token input below.'
      );
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    processToken(manualToken);
    setManualToken('');
  };

  // Calculate gate stats
  const totalScans = recentScans.length;
  const successfulScans = storage.getAttendanceLogs(event?.id).filter(s => s.status === 'valid').length;
  const duplicateScans = storage.getAttendanceLogs(event?.id).filter(s => s.status === 'duplicate').length;
  const invalidScans = storage.getAttendanceLogs(event?.id).filter(s => s.status === 'invalid' || s.status === 'cancelled').length;

  const activeGate = gates.find(g => g.id === selectedGateId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Scanner Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Godswill Akpabio Event Centre</span>
              <span>•</span>
              <span className="text-emerald-600 font-bold">LIVE AUTHENTICATION</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Event Entrance Scanner
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Target Event: <span className="font-semibold text-slate-700">{event?.name || 'No Active Event'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Gate selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="gate-select" className="text-xs font-semibold text-slate-700">Gate:</label>
              <select
                id="gate-select"
                value={selectedGateId}
                onChange={(e) => setSelectedGateId(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              >
                {gates.map((gate) => (
                  <option key={gate.id} value={gate.id}>
                    {gate.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                soundEnabled 
                  ? 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200' 
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
              }`}
              title={soundEnabled ? 'Audio Feedback Enabled' : 'Audio Feedback Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'Audio ON' : 'Muted'}</span>
            </button>
          </div>
        </div>

        {/* Real-time metrics ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] font-medium text-slate-500 block uppercase">Gate Station</span>
            <span className="text-sm font-bold text-slate-900 truncate block mt-0.5">
              {activeGate?.name || 'Gate Terminal'}
            </span>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <span className="text-[11px] font-medium text-emerald-700 block uppercase">Valid Check-Ins</span>
            <span className="text-lg font-extrabold text-emerald-800 block mt-0.5">
              {successfulScans}
            </span>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <span className="text-[11px] font-medium text-amber-700 block uppercase">Duplicate Scans</span>
            <span className="text-lg font-extrabold text-amber-800 block mt-0.5">
              {duplicateScans}
            </span>
          </div>
          <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
            <span className="text-[11px] font-medium text-rose-700 block uppercase">Invalid / Rejected</span>
            <span className="text-lg font-extrabold text-rose-800 block mt-0.5">
              {invalidScans}
            </span>
          </div>
        </div>
      </div>

      {/* Main Scanner Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewfinder & Manual Tester (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-md border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isScanning ? 'bg-emerald-400' : 'bg-slate-500'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isScanning ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {isScanning ? 'Camera Active — Ready for QR' : 'Camera Standby'}
                </span>
              </div>

              {isScanning ? (
                <button
                  onClick={stopCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Pause Camera</span>
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Start Camera</span>
                </button>
              )}
            </div>

            {/* Video Viewport Container */}
            <div className="relative my-3 bg-slate-950 rounded-xl overflow-hidden min-h-[300px] flex items-center justify-center border border-slate-800">
              <div 
                id={scannerContainerId} 
                className="w-full max-w-sm rounded-lg overflow-hidden" 
              />

              {!isScanning && (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Device Camera Offline</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                      Click "Start Camera" to scan paper passes or smartphone screens, or use the instant test buttons below.
                    </p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Launch Camera Scanner</span>
                  </button>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          {/* Quick Simulation & Token Input */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>One-Click Test Bar (Instant Simulation)</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {availableGuests.length} registered guest pass{availableGuests.length === 1 ? '' : 'es'}
              </span>
            </div>

            {/* Quick Test Action Buttons */}
            {availableGuests.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-center space-y-2">
                <p className="text-xs text-slate-600 font-medium">
                  No guest passes in the active roster yet.
                </p>
                <button
                  onClick={handleCreateQuickTestGuest}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Generate Quick Test Pass & Scan</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => activeGuest ? processToken(activeGuest.qr_token) : handleCreateQuickTestGuest()}
                  className="p-2.5 text-left bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800">1. Valid Pass</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-[11px] text-emerald-700 truncate font-semibold mt-1">
                    {activeGuest ? activeGuest.full_name : 'Dr. John Umoh'}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">🟢 Access Granted</div>
                </button>

                <button
                  onClick={() => checkedInGuest ? processToken(checkedInGuest.qr_token) : handleCreateQuickTestGuest()}
                  className="p-2.5 text-left bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800">2. Duplicate</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="text-[11px] text-amber-700 truncate font-semibold mt-1">
                    {checkedInGuest ? checkedInGuest.full_name : 'Re-scan Pass'}
                  </div>
                  <div className="text-[10px] text-amber-600 font-semibold mt-0.5">🔴 Already Checked In</div>
                </button>

                <button
                  onClick={() => {
                    if (disabledGuest) {
                      disabledGuest.is_active = false;
                      storage.saveGuest(disabledGuest);
                      processToken(disabledGuest.qr_token);
                    } else {
                      processToken('EVP-1D4F-8G9H-CANCELLED');
                    }
                  }}
                  className="p-2.5 text-left bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-800">3. Cancelled</span>
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <div className="text-[11px] text-rose-700 truncate font-semibold mt-1">
                    {disabledGuest ? disabledGuest.full_name : 'Deactivated'}
                  </div>
                  <div className="text-[10px] text-rose-600 font-semibold mt-0.5">🔴 Access Denied</div>
                </button>

                <button
                  onClick={() => processToken('EVP-INVALID-9999-XXXX')}
                  className="p-2.5 text-left bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800">4. Invalid</span>
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="text-[11px] text-slate-600 truncate font-mono mt-1">Unrecognized</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">🔴 Fake Token</div>
                </button>
              </div>
            )}

            {/* Registered Guests Quick Dropdown Selector */}
            {availableGuests.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Direct Guest Roster Scan Dropdown:
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      processToken(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">Choose registered guest pass to scan...</option>
                  {availableGuests.map((g) => (
                    <option key={g.id} value={g.qr_token}>
                      {g.full_name} ({g.category}) — {g.qr_token} {g.check_in_status === 'checked_in' ? '[Checked In]' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Manual Token Input */}
            <form onSubmit={handleManualSubmit} className="flex gap-2 pt-2 border-t border-slate-100">
              <div className="relative flex-1">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Paste or type QR token, Ref No (REF-123456), or URL..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <button
                type="submit"
                disabled={!manualToken.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Verify Token
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Instant Verification Display & Live Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Result Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Authentication Feedback
            </h3>

            {lastResult ? (
              <div
                className={`p-5 rounded-xl border-2 transition-all ${
                  lastResult.status === 'valid'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                    : lastResult.status === 'duplicate'
                    ? 'bg-amber-50 border-amber-500 text-amber-950'
                    : 'bg-rose-50 border-rose-500 text-rose-950'
                }`}
              >
                {/* Result Status Header */}
                <div className="flex items-center gap-3">
                  {lastResult.status === 'valid' && (
                    <CheckCircle2 className="w-9 h-9 text-emerald-600 shrink-0" />
                  )}
                  {lastResult.status === 'duplicate' && (
                    <AlertTriangle className="w-9 h-9 text-amber-600 shrink-0" />
                  )}
                  {(lastResult.status === 'invalid' || lastResult.status === 'cancelled') && (
                    <XCircle className="w-9 h-9 text-rose-600 shrink-0" />
                  )}

                  <div>
                    <h4 className="text-lg font-extrabold uppercase tracking-wide">
                      {lastResult.status === 'valid' && '🟢 ACCESS GRANTED'}
                      {lastResult.status === 'duplicate' && '🔴 ALREADY CHECKED IN'}
                      {lastResult.status === 'invalid' && '🔴 INVALID QR CODE'}
                      {lastResult.status === 'cancelled' && '🔴 ACCESS DENIED'}
                    </h4>
                    <p className="text-xs font-medium opacity-80 mt-0.5">
                      {lastResult.message}
                    </p>
                  </div>
                </div>

                {/* Guest Details if available */}
                {lastResult.guest && (
                  <div className="mt-4 pt-3 border-t border-current/10 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">{lastResult.guest.full_name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/80 border border-current/20">
                        {lastResult.guest.category}
                      </span>
                    </div>

                    <div className="text-[11px] opacity-80">
                      Organization: {lastResult.guest.organization || 'Attendee'}
                    </div>

                    {lastResult.status === 'duplicate' && (
                      <div className="p-2.5 bg-white/90 rounded-lg border border-amber-300 text-amber-900 text-[11px] space-y-1">
                        <div className="font-bold">⚠️ Initial Verification Details:</div>
                        <div>Gate: <span className="font-semibold">{lastResult.first_check_in_gate || 'Other entrance'}</span></div>
                        <div>Time: <span className="font-semibold">{lastResult.first_check_in_time ? new Date(lastResult.first_check_in_time).toLocaleTimeString() : 'Earlier today'}</span></div>
                        <div className="text-[10px] text-amber-800 font-medium">Duplicate scan logged for security audit.</div>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[10px] opacity-70 pt-1">
                      <span>Gate: {lastResult.gate_name}</span>
                      <span>{new Date(lastResult.scan_time).toLocaleTimeString()}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setLastResult(null)}
                  className="mt-4 w-full py-2 bg-white/80 hover:bg-white text-slate-800 rounded-lg text-xs font-bold transition-colors border border-current/20"
                >
                  Ready for Next Guest
                </button>
              </div>
            ) : (
              <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">Awaiting Scan Input</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Point camera at pass or click any test credential to verify.
                </p>
              </div>
            )}
          </div>

          {/* Recent Scans Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Live Gate Stream
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Realtime</span>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {recentScans.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No scans recorded yet</p>
              ) : (
                recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {scan.status === 'valid' && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      )}
                      {scan.status === 'duplicate' && (
                        <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      )}
                      {(scan.status === 'invalid' || scan.status === 'cancelled') && (
                        <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {scan.guest_name || scan.qr_token}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {scan.gate_name} • {scan.guest_category || 'Unknown'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          scan.status === 'valid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : scan.status === 'duplicate'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {scan.status}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {new Date(scan.scan_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
