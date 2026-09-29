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
      this.ensureDefaultData();
      setTimeout(() => this.initCloudSync(), 100);
    }
  }

  private ensureDefaultData(): void {
    const events = this.getEvents();
    if (events.length === 0) {
      const defaultEvent: EventItem = {
        id: 'evt-default-1',
        name: 'Godswill Akpabio Event Centre Grand Launch',
        description: 'Official opening ceremony and celebration at Godswill Akpabio Event Centre ukana aks.',
        venue: 'Godswill Akpabio Event Centre ukana aks',
        city: 'Ukana',
        event_date: '2026-10-15',
        start_time: '10:00 AM',
        end_time: '04:00 PM',
        organizer_name: 'Akwa Ibom State Government',
        contact_email: 'events@godswillakpabiocentre.gov.ng',
        contact_phone: '+234 800 000 0000',
        max_guests: 5000,
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([defaultEvent]));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_EVENT_ID, defaultEvent.id);

      const defaultGates: Gate[] = [
        { id: 'gate-1', event_id: defaultEvent.id, name: 'Gate A - Main Entrance', location: 'North Wing', assigned_categories: ['VIP', 'General Guest', 'Government Official', 'Speaker', 'Media', 'Staff', 'Partner', 'Student'], is_active: true, created_at: new Date().toISOString() },
        { id: 'gate-2', event_id: defaultEvent.id, name: 'Gate B - VIP Lounge', location: 'East Wing', assigned_categories: ['VIP', 'Government Official'], is_active: true, created_at: new Date().toISOString() },
        { id: 'gate-3', event_id: defaultEvent.id, name: 'Gate C - Media & Speakers', location: 'West Wing', assigned_categories: ['Speaker', 'Media'], is_active: true, created_at: new Date().toISOString() }
      ];
      localStorage.setItem(STORAGE_KEYS.GATES, JSON.stringify(defaultGates));

      const defaultGuests: Guest[] = [
        {
          id: 'guest-1',
          event_id: defaultEvent.id,
          full_name: 'Hon. Justice Okon',
          email: 'okon@judiciary.gov.ng',
          phone: '+234 803 111 2223',
          organization: 'State Judiciary',
          category: 'Government Official',
          reference_number: 'REF-2026-001',
          qr_token: 'GP-VIP-9921',
          is_active: true,
          check_in_status: 'pending',
          check_in_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'guest-2',
          event_id: defaultEvent.id,
          full_name: 'Dr. Ekaette Umo',
          email: 'ekaette@akwaibom.edu.ng',
          phone: '+234 802 333 4455',
          organization: 'AKSU',
          category: 'Speaker',
          reference_number: 'REF-2026-002',
          qr_token: 'GP-SPK-4412',
          is_active: true,
          check_in_status: 'pending',
          check_in_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'guest-3',
          event_id: defaultEvent.id,
          full_name: 'Blessing Udoh',
          email: 'blessing@istend.com',
          phone: '+234 805 777 8899',
          organization: 'Invited Guest',
          category: 'General Guest',
          reference_number: 'REF-2026-003',
          qr_token: 'GP-GEN-7783',
          is_active: true,
          check_in_status: 'pending',
          check_in_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(defaultGuests));
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
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_EVENTS;
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
    const updatedEvent = {
      ...event,
      updated_at: new Date().toISOString(),
      created_at: event.created_at || new Date().toISOString()
    };

    if (idx >= 0) {
      events[idx] = updatedEvent;
    } else {
      events.push(updatedEvent);
    }
    
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    
    if (isSupabaseConfigured()) {
      getSupabase()?.from('events').upsert(updatedEvent).then(({ error }) => {
        if (error) console.warn('Supabase event sync error:', error.message);
      });
    }

    this.logAudit(
      'Organizer',
      'Event Organizer',
      event.id,
      idx >= 0 ? 'Event Updated' : 'Event Created',
      `Event "${event.name}" saved.`
    );
    this.notifyListeners();
  }

  // Guests CRUD
  getGuests(eventId?: string): Guest[] {
    const targetEventId = eventId || this.getActiveEventId();
    const allGuests = this.getAllGuests();
    return allGuests.filter(g => g.event_id === targetEventId);
  }

  getAllGuests(): Guest[] {
    const saved = localStorage.getItem(STORAGE_KEYS.GUESTS);
    if (!saved) return INITIAL_GUESTS;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_GUESTS;
    } catch {
      return INITIAL_GUESTS;
    }
  }

  saveGuest(guest: Guest): void {
    const updatedGuest = {
      ...guest,
      updated_at: new Date().toISOString(),
      created_at: guest.created_at || new Date().toISOString()
    };

    const all = this.getAllGuests();
    const idx = all.findIndex(g => g.id === guest.id);
    if (idx >= 0) {
      all[idx] = updatedGuest;
    } else {
      all.push(updatedGuest);
    }
    
    localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(all));

    if (isSupabaseConfigured()) {
      getSupabase()?.from('guests').upsert(updatedGuest).then(({ error }) => {
        if (error) console.warn('Supabase guest sync error:', error.message);
      });
    }
    
    this.notifyListeners();
  }

  findGuestByTokenOrRef(tokenInput: string, allGuests: Guest[]): Guest | undefined {
    if (!tokenInput) return undefined;
    let clean = tokenInput.trim();
    if (clean.includes('=')) {
      try {
        const urlObj = new URL(clean.includes('://') ? clean : `http://${clean}`);
        const tokenParam = urlObj.searchParams.get('token') || urlObj.searchParams.get('ref') || urlObj.searchParams.get('q');
        if (tokenParam) clean = tokenParam;
      } catch {}
    }
    const upperClean = clean.toUpperCase();
    return allGuests.find(g => 
      (g.qr_token && g.qr_token.toUpperCase() === upperClean) || 
      (g.reference_number && g.reference_number.toUpperCase() === upperClean) ||
      g.id === tokenInput ||
      (g.qr_token && g.qr_token.toUpperCase().includes(upperClean)) ||
      (g.reference_number && g.reference_number.toUpperCase().includes(upperClean)) ||
      (g.email && g.email.toUpperCase() === upperClean)
    );
  }

  toggleGuestActive(guestId: string): void {
    const all = this.getAllGuests();
    const guest = all.find(g => g.id === guestId);
    if (guest) {
      guest.is_active = !guest.is_active;
      guest.updated_at = new Date().toISOString();
      this.saveGuest(guest);
    }
  }

  regenerateGuestToken(guestId: string): void {
    const all = this.getAllGuests();
    const guest = all.find(g => g.id === guestId);
    if (guest) {
      guest.qr_token = generateToken();
      guest.reference_number = generateReferenceNumber();
      guest.updated_at = new Date().toISOString();
      this.saveGuest(guest);
    }
  }

  deleteGuest(guestId: string): void {
    const all = this.getAllGuests().filter(g => g.id !== guestId);
    localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(all));
    if (isSupabaseConfigured()) {
      getSupabase()?.from('guests').delete().eq('id', guestId).then(({ error }) => {
        if (error) console.warn('Supabase guest delete error:', error.message);
      });
    }
    this.notifyListeners();
  }

  // Gates CRUD
  getGates(eventId?: string): Gate[] {
    const targetEventId = eventId || this.getActiveEventId();
    const allGates = this.getAllGates();
    return allGates.filter(g => g.event_id === targetEventId);
  }

  saveGate(gate: Gate): void {
    const all = this.getAllGates();
    const idx = all.findIndex(g => g.id === gate.id);
    if (idx >= 0) all[idx] = gate;
    else all.push(gate);
    localStorage.setItem(STORAGE_KEYS.GATES, JSON.stringify(all));
    if (isSupabaseConfigured()) {
      getSupabase()?.from('gates').upsert(gate).then(({ error }) => {
        if (error) console.warn('Supabase gate sync error:', error.message);
      });
    }
    this.notifyListeners();
  }

  getAllGates(): Gate[] {
    const saved = localStorage.getItem(STORAGE_KEYS.GATES);
    if (!saved) return INITIAL_GATES;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_GATES;
    } catch {
      return INITIAL_GATES;
    }
  }

  // Staff CRUD
  getStaff(eventId?: string): EventStaff[] {
    const targetEventId = eventId || this.getActiveEventId();
    const allStaff = this.getAllStaff();
    return allStaff.filter(s => s.event_id === targetEventId);
  }

  saveStaff(staffMember: EventStaff): void {
    const all = this.getAllStaff();
    const idx = all.findIndex(s => s.id === staffMember.id);
    if (idx >= 0) all[idx] = staffMember;
    else all.push(staffMember);
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(all));
    if (isSupabaseConfigured()) {
      getSupabase()?.from('event_staff').upsert(staffMember).then(({ error }) => {
        if (error) console.warn('Supabase staff sync error:', error.message);
      });
    }
    this.notifyListeners();
  }

  getAllStaff(): EventStaff[] {
    const saved = localStorage.getItem(STORAGE_KEYS.STAFF);
    if (!saved) return INITIAL_STAFF;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_STAFF;
    } catch {
      return INITIAL_STAFF;
    }
  }

  // Attendance Logs
  getAttendanceLogs(eventId?: string): AttendanceLog[] {
    const targetEventId = eventId || this.getActiveEventId();
    const allLogs = this.getAllAttendanceLogs();
    return allLogs
      .filter(l => l.event_id === targetEventId)
      .sort((a, b) => new Date(b.scan_time).getTime() - new Date(a.scan_time).getTime());
  }

  getAllAttendanceLogs(): AttendanceLog[] {
    const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (!saved) return INITIAL_ATTENDANCE;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_ATTENDANCE;
    } catch {
      return INITIAL_ATTENDANCE;
    }
  }

  verifyAndCheckIn(
    tokenInput: string,
    gateId: string,
    scannerUserName: string,
    deviceInfo = 'Scanner Device'
  ): VerificationResult {
    return this.verifyAndCheckInSync(tokenInput, gateId, scannerUserName, deviceInfo);
  }

  private verifyAndCheckInSync(
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

    const allGuests = this.getAllGuests();
    const guest = this.findGuestByTokenOrRef(tokenInput, allGuests);

    if (guest && guest.event_id && guest.event_id !== activeEventId) {
      this.setActiveEventId(guest.event_id);
    }

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
      return {
        status: 'invalid',
        message: 'Invalid QR Code. This pass/token is not recognized in the system database.',
        gate_name: selectedGate.name,
        scan_time: nowIso,
      };
    }

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
      return {
        status: 'cancelled',
        message: 'Access Denied. This guest invitation has been deactivated or cancelled.',
        guest: guest,
        gate_name: selectedGate.name,
        scan_time: nowIso,
      };
    }

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

      guest.check_in_count = (guest.check_in_count || 1) + 1;
      this.saveGuest(guest);

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
