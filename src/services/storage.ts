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
  async getEvents(): Promise<EventItem[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(data));
          return data;
        }
      }
    }
    
    const saved = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (!saved) return INITIAL_EVENTS;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_EVENTS;
    }
  }

  async saveEvent(event: EventItem): Promise<void> {
    const events = await this.getEvents();
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
      await getSupabase()?.from('events').upsert(updatedEvent);
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
  async getGuests(eventId?: string): Promise<Guest[]> {
    const targetEventId = eventId || this.getActiveEventId();
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase.from('guests').select('*').eq('event_id', targetEventId);
        if (!error && data) {
          const allLocal = this.getAllGuests();
          const others = allLocal.filter(g => g.event_id !== targetEventId);
          localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify([...others, ...data]));
          return data;
        }
      }
    }
    const saved = localStorage.getItem(STORAGE_KEYS.GUESTS);
    let guests: Guest[] = INITIAL_GUESTS;
    if (saved) {
      try { guests = JSON.parse(saved); } catch { guests = INITIAL_GUESTS; }
    }
    return guests.filter(g => g.event_id === targetEventId);
  }

  async saveGuest(guest: Guest): Promise<void> {
    const all = this.getAllGuests();
    const idx = all.findIndex(g => g.id === guest.id);
    if (idx >= 0) all[idx] = guest;
    else all.push(guest);
    localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(all));
    if (isSupabaseConfigured()) {
      await getSupabase()?.from('guests').upsert(guest);
    }
    this.notifyListeners();
  }

  // Gates CRUD
  async getGates(eventId?: string): Promise<Gate[]> {
    const targetEventId = eventId || this.getActiveEventId();
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase.from('gates').select('*').eq('event_id', targetEventId);
        if (!error && data) {
          const allLocal = this.getAllGates();
          const otherGates = allLocal.filter(g => g.event_id !== targetEventId);
          localStorage.setItem(STORAGE_KEYS.GATES, JSON.stringify([...otherGates, ...data]));
          return data;
        }
      }
    }
    const saved = localStorage.getItem(STORAGE_KEYS.GATES);
    let gates: Gate[] = INITIAL_GATES;
    if (saved) {
      try { gates = JSON.parse(saved); } catch { gates = INITIAL_GATES; }
    }
    return gates.filter(g => g.event_id === targetEventId);
  }

  async saveGate(gate: Gate): Promise<void> {
    const all = this.getAllGates();
    const idx = all.findIndex(g => g.id === gate.id);
    if (idx >= 0) all[idx] = gate;
    else all.push(gate);
    localStorage.setItem(STORAGE_KEYS.GATES, JSON.stringify(all));
    if (isSupabaseConfigured()) {
      await getSupabase()?.from('gates').upsert(gate);
    }
    this.notifyListeners();
  }

  private getAllGates(): Gate[] {
    const saved = localStorage.getItem(STORAGE_KEYS.GATES);
    if (!saved) return INITIAL_GATES;
    try { return JSON.parse(saved); } catch { return INITIAL_GATES; }
  }

  // Staff CRUD
  async getStaff(eventId?: string): Promise<EventStaff[]> {
    const targetEventId = eventId || this.getActiveEventId();
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase.from('event_staff').select('*').eq('event_id', targetEventId);
        if (!error && data) {
          const allLocal = this.getAllStaff();
          const otherStaff = allLocal.filter(s => s.event_id !== targetEventId);
          localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify([...otherStaff, ...data]));
          return data;
        }
      }
    }
    const saved = localStorage.getItem(STORAGE_KEYS.STAFF);
    let staffList: EventStaff[] = INITIAL_STAFF;
    if (saved) {
      try { staffList = JSON.parse(saved); } catch { staffList = INITIAL_STAFF; }
    }
    return staffList.filter(s => s.event_id === targetEventId);
  }

  async saveStaff(staffMember: EventStaff): Promise<void> {
    const all = this.getAllStaff();
    const idx = all.findIndex(s => s.id === staffMember.id);
    if (idx >= 0) all[idx] = staffMember;
    else all.push(staffMember);
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(all));
    if (isSupabaseConfigured()) {
      await getSupabase()?.from('event_staff').upsert(staffMember);
    }
    this.notifyListeners();
  }

  private getAllStaff(): EventStaff[] {
    const saved = localStorage.getItem(STORAGE_KEYS.STAFF);
    if (!saved) return INITIAL_STAFF;
    try { return JSON.parse(saved); } catch { return INITIAL_STAFF; }
  }

  private getAllGuests(): Guest[] {
    const saved = localStorage.getItem(STORAGE_KEYS.GUESTS);
    if (!saved) return INITIAL_GUESTS;
    try { return JSON.parse(saved); } catch { return INITIAL_GUESTS; }
  }

  findGuestByTokenOrRef(rawToken: string, allGuests: Guest[]): Guest | undefined {
    if (!rawToken || !rawToken.trim()) return undefined;
    let trimmed = rawToken.trim().toUpperCase();
    return allGuests.find(g => 
      (g.qr_token && g.qr_token.toUpperCase() === trimmed) || 
      (g.reference_number && g.reference_number.toUpperCase() === trimmed) ||
      (g.id && g.id.toUpperCase() === trimmed)
    );
  }

  async deleteGuest(guestId: string): Promise<void> {
    const all = this.getAllGuests().filter(g => g.id !== guestId);
    localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(all));
    if (isSupabaseConfigured()) {
      await getSupabase()?.from('guests').delete().eq('id', guestId);
    }
    this.notifyListeners();
  }

  async toggleGuestActive(guestId: string): Promise<void> {
    const all = this.getAllGuests();
    const guest = all.find(g => g.id === guestId);
    if (guest) {
      guest.is_active = !guest.is_active;
      guest.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(all));
      if (isSupabaseConfigured()) {
        await getSupabase()?.from('guests').update({ is_active: guest.is_active, updated_at: guest.updated_at }).eq('id', guestId);
      }
      this.notifyListeners();
    }
  }

  async regenerateGuestToken(guestId: string): Promise<string | null> {
    const all = this.getAllGuests();
    const guest = all.find(g => g.id === guestId);
    if (guest) {
      const newToken = generateToken();
      guest.qr_token = newToken;
      guest.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(all));
      if (isSupabaseConfigured()) {
        await getSupabase()?.from('guests').update({ qr_token: guest.qr_token, updated_at: guest.updated_at }).eq('id', guestId);
      }
      this.notifyListeners();
      return newToken;
    }
    return null;
  }

  // Attendance Logs
  async getAttendanceLogs(eventId?: string): Promise<AttendanceLog[]> {
    const targetEventId = eventId || this.getActiveEventId();
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('event_id', targetEventId)
          .order('scan_time', { ascending: false })
          .limit(500);
        if (!error && data) {
          return data;
        }
      }
    }
    const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    let logs: AttendanceLog[] = INITIAL_ATTENDANCE;
    if (saved) {
      try { logs = JSON.parse(saved); } catch { logs = INITIAL_ATTENDANCE; }
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

  private verifyAndCheckInSync(
    tokenInput: string,
    gateId: string,
    scannerUserName: string,
    deviceInfo = 'Scanner Device'
  ): VerificationResult {
    const cleanToken = tokenInput.trim().toUpperCase();
    const activeEventId = this.getActiveEventId();
    const nowIso = new Date().toISOString();
    const allGuests = this.getAllGuests();
    const guest = this.findGuestByTokenOrRef(tokenInput, allGuests);

    if (!guest) {
      return { status: 'invalid', message: 'Invalid QR Code.', gate_name: 'Main Gate', scan_time: nowIso };
    }
    if (!guest.is_active) {
      return { status: 'cancelled', message: 'Pass is deactivated.', guest, gate_name: 'Main Gate', scan_time: nowIso };
    }
    if (guest.check_in_status === 'checked_in') {
      return { status: 'duplicate', message: 'Already checked in.', guest, first_check_in_time: guest.first_check_in_time, first_check_in_gate: guest.first_check_in_gate, gate_name: 'Main Gate', scan_time: nowIso };
    }

    guest.check_in_status = 'checked_in';
    guest.first_check_in_time = nowIso;
    guest.first_check_in_gate = gateId;
    this.saveGuestSync(guest);

    const log: AttendanceLog = {
      id: `att-${Date.now()}`,
      event_id: activeEventId,
      guest_id: guest.id,
      guest_name: guest.full_name,
      qr_token: cleanToken,
      gate_id: gateId,
      gate_name: 'Main Gate',
      scanner_user_name: scannerUserName,
      scan_time: nowIso,
      status: 'valid'
    };
    this.recordAttendanceLog(log);
    return { status: 'valid', message: 'Welcome!', guest, gate_name: 'Main Gate', scan_time: nowIso };
  }

  private saveGuestSync(guest: Guest): void {
    const all = this.getAllGuests();
    const idx = all.findIndex(g => g.id === guest.id);
    if (idx >= 0) all[idx] = guest;
    else all.push(guest);
    localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(all));
    if (isSupabaseConfigured()) {
      getSupabase()?.from('guests').upsert(guest).then();
    }
    this.notifyListeners();
  }

  async verifyAndCheckIn(
    tokenInput: string,
    gateId: string,
    scannerUserName: string,
    deviceInfo = 'Scanner Device'
  ): Promise<VerificationResult> {
    const cleanToken = tokenInput.trim().toUpperCase();
    const activeEventId = this.getActiveEventId();
    
    // In Supabase mode, we fetch fresh data to prevent race conditions
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        // Find guest by token
        const { data: guests, error } = await supabase
          .from('guests')
          .select('*')
          .or(`qr_token.eq.${cleanToken},reference_number.eq.${cleanToken}`)
          .eq('event_id', activeEventId)
          .limit(1);

        if (!error && guests && guests.length > 0) {
          const guest = guests[0] as Guest;
          
          if (!guest.is_active) {
            return { status: 'cancelled', message: 'Pass is deactivated.', guest, scan_time: new Date().toISOString() };
          }
          
          if (guest.check_in_status === 'checked_in') {
            return { status: 'duplicate', message: 'Already checked in.', guest, scan_time: new Date().toISOString() };
          }

          // Mark as checked in
          const checkInTime = new Date().toISOString();
          const { error: updateErr } = await supabase
            .from('guests')
            .update({
              check_in_status: 'checked_in',
              first_check_in_time: checkInTime,
              first_check_in_gate: gateId,
              check_in_count: 1
            })
            .eq('id', guest.id);

          if (!updateErr) {
            const log: AttendanceLog = {
              id: `att-${Date.now()}`,
              event_id: activeEventId,
              guest_id: guest.id,
              guest_name: guest.full_name,
              qr_token: cleanToken,
              gate_id: gateId,
              gate_name: 'Main Gate', // Should resolve name
              scanner_user_name: scannerUserName,
              scan_time: checkInTime,
              status: 'valid'
            };
            await supabase.from('attendance_logs').insert(log);
            return { status: 'valid', message: 'Welcome!', guest, scan_time: checkInTime };
          }
        }
      }
    }

    // Fallback to local (same logic as before but wrapped in Promise)
    return this.verifyAndCheckInSync(tokenInput, gateId, scannerUserName, deviceInfo);
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
