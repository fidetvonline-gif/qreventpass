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

// Seed initial events centered on Godswill Akpabio Event Centre
const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'evt-gaec-2026-01',
    name: 'Akwa Ibom Tech & Leadership Summit 2026',
    description: 'Premier national summit bringing together technologists, entrepreneurs, policymakers, and civic leaders for digital transformation and enterprise excellence.',
    venue: 'Godswill Akpabio Event Centre, Banquet Hall & Auditorium',
    city: 'Uyo, Akwa Ibom State',
    event_date: '2026-09-25',
    start_time: '09:00 AM',
    end_time: '05:30 PM',
    organizer_name: 'Akwa Ibom State Innovation Bureau',
    contact_email: 'events@godswillakpabioec.ng',
    contact_phone: '+234 803 123 4567',
    max_guests: 1500,
    status: 'ongoing',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-18T05:00:00Z',
  },
  {
    id: 'evt-gaec-2026-02',
    name: 'South-South Enterprise & Gala Awards',
    description: 'An evening honoring outstanding business pioneers, creative leaders, and community builders in the Niger Delta region.',
    venue: 'Grand Dome, Godswill Akpabio Event Centre',
    city: 'Uyo, Akwa Ibom State',
    event_date: '2026-10-12',
    start_time: '06:00 PM',
    end_time: '11:00 PM',
    organizer_name: 'Regional Enterprise Council',
    contact_email: 'contact@enterpriseawards.ng',
    contact_phone: '+234 802 987 6543',
    max_guests: 800,
    status: 'published',
    created_at: '2026-09-10T10:00:00Z',
    updated_at: '2026-09-15T12:00:00Z',
  },
];

const INITIAL_GATES: Gate[] = [
  {
    id: 'gate-01',
    event_id: 'evt-gaec-2026-01',
    name: 'Gate A — Main Entrance',
    location: 'North Concourse, West Wing',
    assigned_categories: ['General Guest', 'Student', 'Partner'],
    is_active: true,
    created_at: '2026-09-02T09:00:00Z',
  },
  {
    id: 'gate-02',
    event_id: 'evt-gaec-2026-01',
    name: 'Gate B — VIP & Executive Pavilion',
    location: 'East Wing Private Driveway',
    assigned_categories: ['VIP', 'Government Official', 'Speaker'],
    is_active: true,
    created_at: '2026-09-02T09:00:00Z',
  },
  {
    id: 'gate-03',
    event_id: 'evt-gaec-2026-01',
    name: 'Gate C — Media & Press Gate',
    location: 'South Media Terrace',
    assigned_categories: ['Media', 'Staff'],
    is_active: true,
    created_at: '2026-09-02T09:00:00Z',
  },
  {
    id: 'gate-04',
    event_id: 'evt-gaec-2026-01',
    name: 'Gate D — Logistics & Crew Gate',
    location: 'Service Quadrangle',
    assigned_categories: ['Staff'],
    is_active: true,
    created_at: '2026-09-02T09:00:00Z',
  },
];

const INITIAL_STAFF: EventStaff[] = [
  {
    id: 'staff-01',
    event_id: 'evt-gaec-2026-01',
    full_name: 'Emmanuel Udoh',
    email: 'emmanuel.udoh@eventpass.ng',
    phone: '+234 802 111 2233',
    role: 'Scanner Staff',
    gate_id: 'gate-01',
    gate_name: 'Gate A — Main Entrance',
    is_active: true,
    created_at: '2026-09-05T08:00:00Z',
  },
  {
    id: 'staff-02',
    event_id: 'evt-gaec-2026-01',
    full_name: 'Aniebiet Bassey',
    email: 'aniebiet.b@eventpass.ng',
    phone: '+234 803 222 3344',
    role: 'Scanner Staff',
    gate_id: 'gate-02',
    gate_name: 'Gate B — VIP & Executive Pavilion',
    is_active: true,
    created_at: '2026-09-05T08:00:00Z',
  },
  {
    id: 'staff-03',
    event_id: 'evt-gaec-2026-01',
    full_name: 'Kufre Ekpo',
    email: 'kufre.ekpo@eventpass.ng',
    phone: '+234 805 333 4455',
    role: 'Security',
    gate_id: 'gate-03',
    gate_name: 'Gate C — Media & Press Gate',
    is_active: true,
    created_at: '2026-09-05T08:00:00Z',
  },
  {
    id: 'staff-04',
    event_id: 'evt-gaec-2026-01',
    full_name: 'Nsikak Sunday',
    email: 'nsikak.sunday@eventpass.ng',
    phone: '+234 808 444 5566',
    role: 'Event Manager',
    gate_id: 'gate-01',
    gate_name: 'Gate A — Main Entrance',
    is_active: true,
    created_at: '2026-09-05T08:00:00Z',
  },
];

const INITIAL_GUESTS: Guest[] = [
  {
    id: 'gst-001',
    event_id: 'evt-gaec-2026-01',
    full_name: 'Dr. John Umoh',
    email: 'john.umoh@fintechafrica.org',
    phone: '+234 802 345 6789',
    organization: 'FinTech Africa Consortium',
    category: 'VIP',
    reference_number: 'REF-789012',
    qr_token: 'EVP-8F7A-92K4-XP21',
    assigned_gate_id: 'gate-02',
    is_active: true,
    check_in_status: 'pending',
    check_in_count: 0,
    created_at: '2026-09-12T10:15:00Z',
    updated_at: '2026-09-12T10:15:00Z',
  },
  {
    id: 'gst-002',
    event_id: 'evt-gaec-2026-01',
    full_name: 'Mary Asuquo James',
    email: 'mary.james@datasphere.io',
    phone: '+234 808 765 4321',
    organization: 'DataSphere Global',
    category: 'Speaker',
    reference_number: 'REF-451290',
    qr_token: 'EVP-3M9B-7L2P-99QW',
    assigned_gate_id: 'gate-02',
    is_active: true,
    check_in_status: 'checked_in',
    first_check_in_time: '2026-09-18T08:42:15Z',
    first_check_in_gate: 'Gate B — VIP & Executive Pavilion',
    check_in_count: 1,
    created_at: '2026-09-12T11:00:00Z',
    updated_at: '2026-09-18T08:42:15Z',
  },
  {
    id: 'gst-003',
    event_id: 'evt-gaec-2026-01',
    full_name: 'Barr. Obot Idongesit',
    email: 'idongesit.obot@justice.gov.ng',
    phone: '+234 803 555 1212',
    organization: 'Ministry of Digital Economy',
    category: 'Government Official',
    reference_number: 'REF-334901',
    qr_token: 'EVP-6K1X-4V8D-ZZ55',
    assigned_gate_id: 'gate-02',
    is_active: true,
    check_in_status: 'checked_in',
    first_check_in_time: '2026-09-18T08:50:30Z',
    first_check_in_gate: 'Gate B — VIP & Executive Pavilion',
    check_in_count: 1,
    created_at: '2026-09-13T09:20:00Z',
    updated_at: '2026-09-18T08:50:30Z',
  },
  {
    id: 'gst-004',
    event_id: 'evt-gaec-2026-01',
    full_name: 'Chioma Grace Okafor',
    email: 'chioma.okafor@techstars.com',
    phone: '+234 814 999 8877',
    organization: 'Techstars Hub Uyo',
    category: 'Partner',
    reference_number: 'REF-889102',
    qr_token: 'EVP-5T8R-3W2Y-PL10',
    assigned_gate_id: 'gate-01',
    is_active: true,
    check_in_status: 'pending',
    check_in_count: 0,
    created_at: '2026-09-14T14:30:00Z',
    updated_at: '2026-09-14T14:30:00Z',
  },
  {
    id: 'gst-005',
    event_id: 'evt-gaec-2026-01',
    full_name: 'David Peter Akpan',
    email: 'david.akpan@channels.tv',
    phone: '+234 809 123 9876',
    organization: 'Channels Television Network',
    category: 'Media',
    reference_number: 'REF-112344',
    qr_token: 'EVP-2N7U-8K5J-TT44',
    assigned_gate_id: 'gate-03',
    is_active: true,
    check_in_status: 'checked_in',
    first_check_in_time: '2026-09-18T08:55:10Z',
    first_check_in_gate: 'Gate C — Media & Press Gate',
    check_in_count: 1,
    created_at: '2026-09-14T16:00:00Z',
    updated_at: '2026-09-18T08:55:10Z',
  },
  {
    id: 'gst-006',
    event_id: 'evt-gaec-2026-01',
    full_name: 'Blessing Effiong Bassey',
    email: 'blessing.effiong@uniuyo.edu.ng',
    phone: '+234 806 777 6655',
    organization: 'University of Uyo (Computer Science Dept)',
    category: 'Student',
    reference_number: 'REF-667821',
    qr_token: 'EVP-9P4S-1Z7M-BB88',
    assigned_gate_id: 'gate-01',
    is_active: true,
    check_in_status: 'pending',
    check_in_count: 0,
    created_at: '2026-09-15T10:10:00Z',
    updated_at: '2026-09-15T10:10:00Z',
  },
  {
    id: 'gst-007',
    event_id: 'evt-gaec-2026-01',
    full_name: 'Tunde Olawale Balogun',
    email: 'tunde@cloudscale.ng',
    phone: '+234 812 333 9900',
    organization: 'CloudScale Infrastructure',
    category: 'General Guest',
    reference_number: 'REF-990145',
    qr_token: 'EVP-4K8V-9Q3W-XX12',
    assigned_gate_id: 'gate-01',
    is_active: true,
    check_in_status: 'checked_in',
    first_check_in_time: '2026-09-18T09:12:04Z',
    first_check_in_gate: 'Gate A — Main Entrance',
    check_in_count: 1,
    created_at: '2026-09-15T12:00:00Z',
    updated_at: '2026-09-18T09:12:04Z',
  },
  {
    id: 'gst-008',
    event_id: 'evt-gaec-2026-01',
    full_name: 'Engr. Victor Etim',
    email: 'victor.etim@akspower.com',
    phone: '+234 803 888 2211',
    organization: 'Ibom Power Company',
    category: 'VIP',
    reference_number: 'REF-552199',
    qr_token: 'EVP-7L1M-5R6K-VV33',
    assigned_gate_id: 'gate-02',
    is_active: true,
    check_in_status: 'pending',
    check_in_count: 0,
    created_at: '2026-09-15T15:45:00Z',
    updated_at: '2026-09-15T15:45:00Z',
  },
  {
    id: 'gst-009',
    event_id: 'evt-gaec-2026-01',
    full_name: 'Praise Samuel Nwafor',
    email: 'praise.nwafor@cancelled-invite.com',
    phone: '+234 807 444 3322',
    organization: 'Ex-Vendor Services',
    category: 'General Guest',
    reference_number: 'REF-009812',
    qr_token: 'EVP-1D4F-8G9H-CANCELLED',
    assigned_gate_id: 'gate-01',
    is_active: false, // Inactive / Cancelled
    check_in_status: 'pending',
    check_in_count: 0,
    created_at: '2026-09-16T08:00:00Z',
    updated_at: '2026-09-17T11:00:00Z',
  }
];

const INITIAL_ATTENDANCE: AttendanceLog[] = [
  {
    id: 'att-001',
    event_id: 'evt-gaec-2026-01',
    guest_id: 'gst-002',
    guest_name: 'Mary Asuquo James',
    guest_category: 'Speaker',
    guest_organization: 'DataSphere Global',
    qr_token: 'EVP-3M9B-7L2P-99QW',
    gate_id: 'gate-02',
    gate_name: 'Gate B — VIP & Executive Pavilion',
    scanner_user_id: 'staff-02',
    scanner_user_name: 'Aniebiet Bassey',
    scan_time: '2026-09-18T08:42:15Z',
    status: 'valid',
    device_info: 'Chrome on Galaxy Tab S9 (Gate B Terminal)',
  },
  {
    id: 'att-002',
    event_id: 'evt-gaec-2026-01',
    guest_id: 'gst-003',
    guest_name: 'Barr. Obot Idongesit',
    guest_category: 'Government Official',
    guest_organization: 'Ministry of Digital Economy',
    qr_token: 'EVP-6K1X-4V8D-ZZ55',
    gate_id: 'gate-02',
    gate_name: 'Gate B — VIP & Executive Pavilion',
    scanner_user_id: 'staff-02',
    scanner_user_name: 'Aniebiet Bassey',
    scan_time: '2026-09-18T08:50:30Z',
    status: 'valid',
    device_info: 'Chrome on Galaxy Tab S9 (Gate B Terminal)',
  },
  {
    id: 'att-003',
    event_id: 'evt-gaec-2026-01',
    guest_id: 'gst-005',
    guest_name: 'David Peter Akpan',
    guest_category: 'Media',
    guest_organization: 'Channels Television Network',
    qr_token: 'EVP-2N7U-8K5J-TT44',
    gate_id: 'gate-03',
    gate_name: 'Gate C — Media & Press Gate',
    scanner_user_id: 'staff-03',
    scanner_user_name: 'Kufre Ekpo',
    scan_time: '2026-09-18T08:55:10Z',
    status: 'valid',
    device_info: 'iPhone 15 Pro (Gate C Scanner)',
  },
  {
    id: 'att-004',
    event_id: 'evt-gaec-2026-01',
    guest_id: 'gst-007',
    guest_name: 'Tunde Olawale Balogun',
    guest_category: 'General Guest',
    guest_organization: 'CloudScale Infrastructure',
    qr_token: 'EVP-4K8V-9Q3W-XX12',
    gate_id: 'gate-01',
    gate_name: 'Gate A — Main Entrance',
    scanner_user_id: 'staff-01',
    scanner_user_name: 'Emmanuel Udoh',
    scan_time: '2026-09-18T09:12:04Z',
    status: 'valid',
    device_info: 'Galaxy S24 (Gate A Terminal 1)',
  },
  {
    id: 'att-005',
    event_id: 'evt-gaec-2026-01',
    guest_id: 'gst-002',
    guest_name: 'Mary Asuquo James',
    guest_category: 'Speaker',
    guest_organization: 'DataSphere Global',
    qr_token: 'EVP-3M9B-7L2P-99QW',
    gate_id: 'gate-01',
    gate_name: 'Gate A — Main Entrance',
    scanner_user_id: 'staff-01',
    scanner_user_name: 'Emmanuel Udoh',
    scan_time: '2026-09-18T09:15:22Z',
    status: 'duplicate',
    notes: 'Already checked in at Gate B at 08:42 AM',
    device_info: 'Galaxy S24 (Gate A Terminal 1)',
  },
];

const INITIAL_AUDIT: AuditLog[] = [
  {
    id: 'aud-01',
    user_name: 'Platform Administrator',
    user_role: 'Super Admin',
    event_id: 'evt-gaec-2026-01',
    action: 'Event Initialized',
    description: 'Created Akwa Ibom Tech & Leadership Summit 2026 at Godswill Akpabio Event Centre.',
    timestamp: '2026-09-01T08:00:00Z',
  },
  {
    id: 'aud-02',
    user_name: 'Aniebiet Bassey',
    user_role: 'Scanner Staff',
    event_id: 'evt-gaec-2026-01',
    action: 'Gate Check-in',
    description: 'Authenticated VIP Guest Dr. John Umoh via QR token EVP-8F7A-92K4-XP21 at Gate B.',
    timestamp: '2026-09-18T08:42:15Z',
  },
  {
    id: 'aud-03',
    user_name: 'Emmanuel Udoh',
    user_role: 'Scanner Staff',
    event_id: 'evt-gaec-2026-01',
    action: 'Duplicate QR Detected',
    description: 'Flagged duplicate scan for Mary Asuquo James at Gate A. Original entry occurred at Gate B.',
    timestamp: '2026-09-18T09:15:22Z',
  },
];

class StorageService {
  private isRealtimeSubscribed = false;

  constructor() {
    if (typeof window !== 'undefined') {
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
    return INITIAL_EVENTS[0].id;
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

  getGuestByToken(token: string): Guest | undefined {
    return this.getAllGuests().find(
      g => g.qr_token.trim().toUpperCase() === token.trim().toUpperCase()
    );
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

    // 1. Search database for token
    const allGuests = this.getAllGuests();
    const guest = allGuests.find(g => g.qr_token.toUpperCase() === cleanToken);

    // Case 1: INVALID QR CODE (token does not exist or doesn't match active event)
    if (!guest || guest.event_id !== activeEventId) {
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
        notes: 'Token not found in active event database',
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
        message: 'Invalid QR Code. This pass is not recognized for this event.',
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
