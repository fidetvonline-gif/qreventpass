import { 
  EventItem, 
  Guest, 
  Gate, 
  EventStaff, 
  AttendanceLog, 
  AuditLog, 
  VerificationResult,
  ScanResultStatus
} from '../types';
import { generateToken, generateReferenceNumber } from './qr';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEYS = {
  EVENTS: 'eventpass_events',
  GUESTS: 'eventpass_guests',
  GATES: 'eventpass_gates',
  STAFF: 'eventpass_staff',
  ATTENDANCE: 'eventpass_attendance',
  AUDIT: 'eventpass_audit',
  ACTIVE_EVENT_ID: 'eventpass_active_event_id',
};

// Clean initial data - All demo data removed per user request
const INITIAL_EVENTS: EventItem[] = [];
const INITIAL_GATES: Gate[] = [];
const INITIAL_STAFF: EventStaff[] = [];
const INITIAL_GUESTS: Guest[] = [];
const INITIAL_ATTENDANCE: AttendanceLog[] = [];
const INITIAL_AUDIT: AuditLog[] = [];

class StorageService {
  private isRealtimeSubscribed = false;

  constructor() {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('eventpass_demo_wiped_v4')) {
        this.resetAll();
        localStorage.setItem('eventpass_demo_wiped_v4', 'true');
      }
      setTimeout(() => this.initCloudSync(), 100);
    }
  }

  isCloudSyncActive(): boolean {
    return isSupabaseConfigured();
  }

  private initCloudSync(): void {
    if (!isSupabaseConfigured() || this.isRealtimeSubscribed) return;

    const supabase = getSupabase();
    if (!supabase) return;

    // Trigger initial background sync
    this.syncWithSupabase().catch(() => {});

    // Set up Realtime listener for incoming scans and guest changes across all gates
    try {
      this.isRealtimeSubscribed = true;
      supabase
        .channel('eventpass_realtime_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const newLog = payload.new as AttendanceLog;
            const currentLogs = this.getAllAttendanceLogs();
            if (!currentLogs.some(l => l.id === newLog.id)) {
              currentLogs.unshift(newLog);
              localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(currentLogs.slice(0, 1000)));
              this.notifyListeners();
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, (payload) => {
          if (payload.new) {
            const updatedGuest = payload.new as Guest;
            const allGuests = this.getAllGuests();
            const idx = allGuests.findIndex(g => g.id === updatedGuest.id);
            if (idx >= 0) {
              allGuests[idx] = updatedGuest;
            } else {
              allGuests.push(updatedGuest);
            }
            localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(allGuests));
            this.notifyListeners();
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }
  }

  async syncWithSupabase(): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Supabase credentials not configured in environment.' };
    }

    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, message: 'Could not initialize Supabase client.' };
    }

    try {
      // 1. Sync Events
      const { data: remoteEvents } = await supabase.from('events').select('*');
      if (remoteEvents && remoteEvents.length > 0) {
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(remoteEvents));
      } else {
        const localEvents = this.getEvents();
        await supabase.from('events').upsert(localEvents);
      }

      // 2. Sync Gates
      const { data: remoteGates } = await supabase.from('gates').select('*');
      if (remoteGates && remoteGates.length > 0) {
        localStorage.setItem(STORAGE_KEYS.GATES, JSON.stringify(remoteGates));
      } else {
        const localGates = this.getAllGates();
        await supabase.from('gates').upsert(localGates);
      }

      // 3. Sync Guests
      const { data: remoteGuests } = await supabase.from('guests').select('*');
      if (remoteGuests && remoteGuests.length > 0) {
        localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(remoteGuests));
      } else {
        const localGuests = this.getAllGuests();
        await supabase.from('guests').upsert(localGuests);
      }

      // 4. Sync Attendance Logs
      const { data: remoteAttendance } = await supabase
        .from('attendance_logs')
        .select('*')
        .order('scan_time', { ascending: false })
        .limit(500);
      if (remoteAttendance && remoteAttendance.length > 0) {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(remoteAttendance));
      }

      // 5. Sync Audit Logs
      const { data: remoteAudit } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(200);
      if (remoteAudit && remoteAudit.length > 0) {
        localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(remoteAudit));
      }

      this.notifyListeners();
      return { success: true, message: 'Successfully synchronized data with Supabase Cloud Database.' };
    } catch (err: any) {
      console.warn('Supabase sync warning:', err);
      return { success: false, message: err?.message || 'Sync failed.' };
    }
  }

  private notifyListeners(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eventpass:data_updated'));
    }
  }

  // Active event selector
  getActiveEventId(): string {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_EVENT_ID);
    if (saved) return saved;
    const events = this.getEvents();
    if (events && events.length > 0) return events[0].id;
    return '';
  }

  setActiveEventId(eventId: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_EVENT_ID, eventId);
    this.notifyListeners();
  }

  // Events CRUD
  getEvents(): EventItem[] {
    const saved = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (!saved) {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
      return INITIAL_EVENTS;
    }
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_EVENTS;
    }
  }

  getEvent(id: string): EventItem | undefined {
    return this.getEvents().find(e => e.id === id);
  }

  saveEvent(event: EventItem): void {
    const events = this.getEvents();
    const idx = events.findIndex(e => e.id === event.id);
    if (idx >= 0) {
      events[idx] = { ...event, updated_at: new Date().toISOString() };
    } else {
      events.push({
        ...event,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    this.logAudit(
      'Organizer',
      'Event Organizer',
      event.id,
      idx >= 0 ? 'Event Updated' : 'Event Created',
      `Event "${event.name}" saved with status "${event.status}".`
    );
    this.notifyListeners();

    if (isSupabaseConfigured()) {
      getSupabase()?.from('events').upsert(event).then(({ error }) => {
        if (error) console.warn('Supabase event sync error:', error.message);
      });
    }
  }

  // Gates CRUD
  getGates(eventId?: string): Gate[] {
    const targetEventId = eventId || this.getActiveEventId();
    const saved = localStorage.getItem(STORAGE_KEYS.GATES);
    let gates: Gate[] = INITIAL_GATES;
    if (saved) {
      try {
        gates = JSON.parse(saved);
      } catch {
        gates = INITIAL_GATES;
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.GATES, JSON.stringify(INITIAL_GATES));
    }
    return gates.filter(g => g.event_id === targetEventId);
  }

  saveGate(gate: Gate): void {
    const all = this.getAllGates();
    const idx = all.findIndex(g => g.id === gate.id);
    if (idx >= 0) {
      all[idx] = gate;
    } else {
      all.push(gate);
    }
    localStorage.setItem(STORAGE_KEYS.GATES, JSON.stringify(all));
    this.notifyListeners();

    if (isSupabaseConfigured()) {
      getSupabase()?.from('gates').upsert(gate).then(({ error }) => {
        if (error) console.warn('Supabase gate sync error:', error.message);
      });
    }
  }

  private getAllGates(): Gate[] {
    const saved = localStorage.getItem(STORAGE_KEYS.GATES);
    if (!saved) return INITIAL_GATES;
    try { return JSON.parse(saved); } catch { return INITIAL_GATES; }
  }

  // Staff CRUD
  getStaff(eventId?: string): EventStaff[] {
    const targetEventId = eventId || this.getActiveEventId();
    const saved = localStorage.getItem(STORAGE_KEYS.STAFF);
    let staffList: EventStaff[] = INITIAL_STAFF;
    if (saved) {
      try { staffList = JSON.parse(saved); } catch { staffList = INITIAL_STAFF; }
    } else {
      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(INITIAL_STAFF));
    }
    return staffList.filter(s => s.event_id === targetEventId);
  }

  saveStaff(staffMember: EventStaff): void {
    const all = this.getAllStaff();
    const idx = all.findIndex(s => s.id === staffMember.id);
    if (idx >= 0) {
      all[idx] = staffMember;
    } else {
      all.push(staffMember);
    }
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(all));
    this.notifyListeners();

    if (isSupabaseConfigured()) {
      getSupabase()?.from('event_staff').upsert(staffMember).then(({ error }) => {
        if (error) console.warn('Supabase staff sync error:', error.message);
      });
    }
  }

  private getAllStaff(): EventStaff[] {
    const saved = localStorage.getItem(STORAGE_KEYS.STAFF);
    if (!saved) return INITIAL_STAFF;
    try { return JSON.parse(saved); } catch { return INITIAL_STAFF; }
  }

  // Guests CRUD
  getGuests(eventId?: string): Guest[] {
    const targetEventId = eventId || this.getActiveEventId();
    const saved = localStorage.getItem(STORAGE_KEYS.GUESTS);
    let guests: Guest[] = INITIAL_GUESTS;
    if (saved) {
      try { guests = JSON.parse(saved); } catch { guests = INITIAL_GUESTS; }
    } else {
      localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(INITIAL_GUESTS));
    }
    return guests.filter(g => g.event_id === targetEventId);
  }

  getAllGuests(): Guest[] {
    const saved = localStorage.getItem(STORAGE_KEYS.GUESTS);
    if (!saved) return INITIAL_GUESTS;
    try { return JSON.parse(saved); } catch { return INITIAL_GUESTS; }
  }

  findGuestByTokenOrRef(rawToken: string, allGuests: Guest[]): Guest | undefined {
    if (!rawToken || !rawToken.trim()) return undefined;
    let trimmed = rawToken.trim();

    // Strip leading/trailing double or single quotes
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      trimmed = trimmed.slice(1, -1).trim();
    }

    // 1. Try parsing JSON if input looks like JSON
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        const possibleToken = parsed.qr_token || parsed.token || parsed.reference_number || parsed.ref || parsed.id || parsed.code;
        if (typeof possibleToken === 'string' && possibleToken) {
          const found = this.findGuestByTokenOrRef(possibleToken, allGuests);
          if (found) return found;
        }
      } catch {
        // ignore json parse error
      }
    }

    // 2. Extract EVP-XXXX-XXXX-XXXX or REF-XXXXXX using regex
    const evpMatch = trimmed.match(/EVP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/i);
    if (evpMatch) {
      const matchedToken = evpMatch[0].toUpperCase();
      const guest = allGuests.find(g => g.qr_token && g.qr_token.toUpperCase() === matchedToken);
      if (guest) return guest;
    }

    const refMatch = trimmed.match(/REF-\d{5,8}/i);
    if (refMatch) {
      const matchedRef = refMatch[0].toUpperCase();
      const guest = allGuests.find(g => g.reference_number && g.reference_number.toUpperCase() === matchedRef);
      if (guest) return guest;
    }

    const clean = trimmed.toUpperCase();
    const cleanNoDash = clean.replace(/[^A-Z0-9]/g, '');

    // 3. Direct match on qr_token, reference_number, or id
    return allGuests.find(g => {
      const qr = (g.qr_token || '').toUpperCase();
      const ref = (g.reference_number || '').toUpperCase();
      const id = (g.id || '').toUpperCase();

      if (qr === clean || ref === clean || id === clean) return true;
      if (qr && qr.replace(/[^A-Z0-9]/g, '') === cleanNoDash) return true;
      if (qr && clean.includes(qr) && qr.length > 3) return true;
      if (ref && clean.includes(ref) && ref.length > 3) return true;

      return false;
    });
  }

  getGuestByToken(token: string): Guest | undefined {
    return this.findGuestByTokenOrRef(token, this.getAllGuests());
  }

  saveGuest(guest: Guest): void {
    const all = this.getAllGuests();
    const idx = all.findIndex(g => g.id === guest.id);
    let targetGuest: Guest;
    if (idx >= 0) {
      targetGuest = { ...guest, updated_at: new Date().toISOString() };
      all[idx] = targetGuest;
    } else {
      targetGuest = {
        ...guest,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      all.push(targetGuest);
    }
    localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(all));
    this.notifyListeners();

    if (isSupabaseConfigured()) {
      getSupabase()?.from('guests').upsert(targetGuest).then(({ error }) => {
        if (error) console.warn('Supabase guest sync error:', error.message);
      });
    }
  }

  deleteGuest(guestId: string): void {
    const all = this.getAllGuests().filter(g => g.id !== guestId);
    localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(all));
    this.notifyListeners();
  }

  toggleGuestActive(guestId: string): void {
    const all = this.getAllGuests();
    const guest = all.find(g => g.id === guestId);
    if (guest) {
      guest.is_active = !guest.is_active;
      guest.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(all));
      this.logAudit(
        'Admin',
        'Organizer',
        guest.event_id,
        guest.is_active ? 'Guest Activated' : 'Guest Disabled',
        `Guest ${guest.full_name} (${guest.qr_token}) pass ${guest.is_active ? 'enabled' : 'disabled'}.`
      );
      this.notifyListeners();

      if (isSupabaseConfigured()) {
        getSupabase()?.from('guests').upsert(guest).then(({ error }) => {
          if (error) console.warn('Supabase toggle guest error:', error.message);
        });
      }
    }
  }

  regenerateGuestToken(guestId: string): string | null {
    const all = this.getAllGuests();
    const guest = all.find(g => g.id === guestId);
    if (guest) {
      const newToken = generateToken();
      guest.qr_token = newToken;
      guest.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(all));
      this.logAudit(
        'Admin',
        'Organizer',
        guest.event_id,
        'QR Token Regenerated',
        `Regenerated QR token for ${guest.full_name} to ${newToken}.`
      );
      this.notifyListeners();

      if (isSupabaseConfigured()) {
        getSupabase()?.from('guests').upsert(guest).then(({ error }) => {
          if (error) console.warn('Supabase regen token error:', error.message);
        });
      }
      return newToken;
    }
    return null;
  }

  // Attendance Logs
  getAttendanceLogs(eventId?: string): AttendanceLog[] {
    const targetEventId = eventId || this.getActiveEventId();
    const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    let logs: AttendanceLog[] = INITIAL_ATTENDANCE;
    if (saved) {
      try { logs = JSON.parse(saved); } catch { logs = INITIAL_ATTENDANCE; }
    } else {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(INITIAL_ATTENDANCE));
    }
    return logs
      .filter(l => l.event_id === targetEventId)
      .sort((a, b) => new Date(b.scan_time).getTime() - new Date(a.scan_time).getTime());
  }

  getAllAttendanceLogs(): AttendanceLog[] {
    const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (!saved) return INITIAL_ATTENDANCE;
    try { return JSON.parse(saved); } catch { return INITIAL_ATTENDANCE; }
  }

  // THE CORE VERIFICATION & SCANNING ENGINE (Modules 6, 7, 8, 30)
  verifyAndCheckIn(
    tokenInput: string,
    gateId: string,
    scannerUserName: string,
    deviceInfo = 'Scanner Device'
  ): VerificationResult {
    const cleanToken = tokenInput.trim().toUpperCase();
    const activeEventId = this.getActiveEventId();
    const gates = this.getGates(activeEventId);
    const selectedGate = gates.find(g => g.id === gateId) || gates[0] || {
      id: 'gate-default',
      name: 'Main Gate',
    };
    const nowIso = new Date().toISOString();

    // 1. Search database for token across all guests using flexible matcher
    const allGuests = this.getAllGuests();
    const guest = this.findGuestByTokenOrRef(tokenInput, allGuests);

    // Case 1: INVALID QR CODE (token does not exist anywhere in database)
    if (!guest) {
      const logEntry: AttendanceLog = {
        id: `att-${Date.now()}`,
        event_id: activeEventId,
        qr_token: cleanToken,
        gate_id: selectedGate.id,
        gate_name: selectedGate.name,
        scanner_user_id: 'scanner-current',
        scanner_user_name: scannerUserName,
        scan_time: nowIso,
        status: 'invalid',
        notes: 'Token not found in database',
        device_info: deviceInfo,
      };
      this.recordAttendanceLog(logEntry);
      this.logAudit(
        scannerUserName,
        'Scanner Staff',
        activeEventId,
        'Invalid QR Scanned',
        `Unrecognized token scanned: ${cleanToken} at ${selectedGate.name}`
      );
      return {
        status: 'invalid',
        message: 'Invalid QR Code. This pass/token is not recognized in the system database.',
        gate_name: selectedGate.name,
        scan_time: nowIso,
      };
    }

    // Check Event Alignment
    const events = this.getEvents();
    const isMatchingEvent = 
      guest.event_id === activeEventId || 
      !activeEventId || 
      activeEventId === 'empty-event' ||
      events.length <= 1;

    if (!isMatchingEvent) {
      const passEvent = events.find(e => e.id === guest.event_id);
      const passEventName = passEvent ? passEvent.name : 'another event';
      const logEntry: AttendanceLog = {
        id: `att-${Date.now()}`,
        event_id: activeEventId,
        guest_id: guest.id,
        guest_name: guest.full_name,
        guest_category: guest.category,
        qr_token: guest.qr_token,
        gate_id: selectedGate.id,
        gate_name: selectedGate.name,
        scanner_user_id: 'scanner-current',
        scanner_user_name: scannerUserName,
        scan_time: nowIso,
        status: 'invalid',
        notes: `Pass belongs to "${passEventName}" instead of active event`,
        device_info: deviceInfo,
      };
      this.recordAttendanceLog(logEntry);
      return {
        status: 'invalid',
        message: `Pass Recognized for "${guest.full_name}", but it belongs to "${passEventName}". Please select that event in top header.`,
        guest: guest,
        gate_name: selectedGate.name,
        scan_time: nowIso,
      };
    }

    // Case 2: INACTIVE / CANCELLED INVITATION
    if (!guest.is_active) {
      const logEntry: AttendanceLog = {
        id: `att-${Date.now()}`,
        event_id: activeEventId,
        guest_id: guest.id,
        guest_name: guest.full_name,
        guest_category: guest.category,
        guest_organization: guest.organization,
        qr_token: cleanToken,
        gate_id: selectedGate.id,
        gate_name: selectedGate.name,
        scanner_user_id: 'scanner-current',
        scanner_user_name: scannerUserName,
        scan_time: nowIso,
        status: 'cancelled',
        notes: 'Guest credential disabled/cancelled',
        device_info: deviceInfo,
      };
      this.recordAttendanceLog(logEntry);
      this.logAudit(
        scannerUserName,
        'Scanner Staff',
        activeEventId,
        'Cancelled Pass Rejected',
        `Attempted entry with cancelled pass: ${guest.full_name} (${cleanToken}) at ${selectedGate.name}`
      );
      return {
        status: 'cancelled',
        message: 'Access Denied. This guest invitation has been deactivated or cancelled.',
        guest: guest,
        gate_name: selectedGate.name,
        scan_time: nowIso,
      };
    }

    // Case 3: DUPLICATE CHECK-IN (Already checked in!)
    if (guest.check_in_status === 'checked_in') {
      const logEntry: AttendanceLog = {
        id: `att-${Date.now()}`,
        event_id: activeEventId,
        guest_id: guest.id,
        guest_name: guest.full_name,
        guest_category: guest.category,
        guest_organization: guest.organization,
        qr_token: cleanToken,
        gate_id: selectedGate.id,
        gate_name: selectedGate.name,
        scanner_user_id: 'scanner-current',
        scanner_user_name: scannerUserName,
        scan_time: nowIso,
        status: 'duplicate',
        notes: `Duplicate scan attempt! First scan was at ${guest.first_check_in_time ? new Date(guest.first_check_in_time).toLocaleTimeString() : 'earlier'} at ${guest.first_check_in_gate || 'another gate'}`,
        device_info: deviceInfo,
      };
      this.recordAttendanceLog(logEntry);

      // Increment total scan attempts count
      guest.check_in_count = (guest.check_in_count || 1) + 1;
      this.saveGuest(guest);

      this.logAudit(
        scannerUserName,
        'Scanner Staff',
        activeEventId,
        'Duplicate Check-in Flagged',
        `Duplicate scan detected for ${guest.full_name} at ${selectedGate.name}. Initial scan was at ${guest.first_check_in_gate}`
      );

      return {
        status: 'duplicate',
        message: 'Already Checked In. This QR code has already been processed at an entrance.',
        guest: guest,
        first_check_in_time: guest.first_check_in_time,
        first_check_in_gate: guest.first_check_in_gate,
        gate_name: selectedGate.name,
        scan_time: nowIso,
      };
    }

    // Case 4: SUCCESS (ACCESS GRANTED)
    guest.check_in_status = 'checked_in';
    guest.first_check_in_time = nowIso;
    guest.first_check_in_gate = selectedGate.name;
    guest.check_in_count = 1;
    this.saveGuest(guest);

    const logEntry: AttendanceLog = {
      id: `att-${Date.now()}`,
      event_id: activeEventId,
      guest_id: guest.id,
      guest_name: guest.full_name,
      guest_category: guest.category,
      guest_organization: guest.organization,
      qr_token: cleanToken,
      gate_id: selectedGate.id,
      gate_name: selectedGate.name,
      scanner_user_id: 'scanner-current',
      scanner_user_name: scannerUserName,
      scan_time: nowIso,
      status: 'valid',
      device_info: deviceInfo,
    };
    this.recordAttendanceLog(logEntry);

    this.logAudit(
      scannerUserName,
      'Scanner Staff',
      activeEventId,
      'Access Granted',
      `Guest authenticated: ${guest.full_name} (${guest.category}) at ${selectedGate.name}`
    );

    return {
      status: 'valid',
      message: 'Access Granted. Valid credential confirmed.',
      guest: guest,
      gate_name: selectedGate.name,
      scan_time: nowIso,
    };
  }

  private recordAttendanceLog(log: AttendanceLog): void {
    const all = this.getAllAttendanceLogs();
    all.unshift(log);
    // keep up to 1000 logs
    const trimmed = all.slice(0, 1000);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(trimmed));
    this.notifyListeners();

    if (isSupabaseConfigured()) {
      getSupabase()?.from('attendance_logs').insert(log).then(({ error }) => {
        if (error) console.warn('Supabase attendance log error:', error.message);
      });
    }
  }

  // Audit trail
  getAuditLogs(eventId?: string): AuditLog[] {
    const targetEventId = eventId || this.getActiveEventId();
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT);
    let logs: AuditLog[] = INITIAL_AUDIT;
    if (saved) {
      try { logs = JSON.parse(saved); } catch { logs = INITIAL_AUDIT; }
    } else {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(INITIAL_AUDIT));
    }
    return logs
      .filter(l => !l.event_id || l.event_id === targetEventId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  logAudit(
    userName: string,
    userRole: string,
    eventId: string,
    action: string,
    description: string
  ): void {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT);
    let logs: AuditLog[] = INITIAL_AUDIT;
    if (saved) {
      try { logs = JSON.parse(saved); } catch { logs = INITIAL_AUDIT; }
    }
    const newEntry = {
      id: `aud-${Date.now()}`,
      user_name: userName,
      user_role: userRole,
      event_id: eventId,
      action: action,
      description: description,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(logs.slice(0, 500)));

    if (isSupabaseConfigured()) {
      getSupabase()?.from('audit_logs').insert(newEntry).then(({ error }) => {
        if (error) console.warn('Supabase audit log error:', error.message);
      });
    }
  }

  // Reset to initial demo state
  resetAll(): void {
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
    localStorage.removeItem(STORAGE_KEYS.GUESTS);
    localStorage.removeItem(STORAGE_KEYS.GATES);
    localStorage.removeItem(STORAGE_KEYS.STAFF);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    localStorage.removeItem(STORAGE_KEYS.AUDIT);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_EVENT_ID);
    this.notifyListeners();
  }
}

export const storage = new StorageService();
