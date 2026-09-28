export type UserRole = 'super_admin' | 'organizer' | 'scanner_staff' | 'guest';

export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';

export type GuestCategory = 
  | 'VIP' 
  | 'Speaker' 
  | 'Staff' 
  | 'Media' 
  | 'General Guest' 
  | 'Partner' 
  | 'Student' 
  | 'Government Official';

export type CheckInStatus = 'pending' | 'checked_in';

export type ScanResultStatus = 'valid' | 'duplicate' | 'invalid' | 'cancelled';

export interface EventItem {
  id: string;
  name: string;
  description: string;
  venue: string;
  city: string;
  event_date: string;
  start_time: string;
  end_time: string;
  organizer_name: string;
  contact_email: string;
  contact_phone: string;
  max_guests: number;
  status: EventStatus;
  banner_url?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Gate {
  id: string;
  event_id: string;
  name: string;
  location: string;
  assigned_categories: GuestCategory[];
  is_active: boolean;
  total_scans?: number;
  created_at: string;
}

export interface Guest {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  phone: string;
  organization: string;
  category: GuestCategory;
  reference_number: string;
  qr_token: string;
  assigned_gate_id?: string;
  is_active: boolean;
  check_in_status: CheckInStatus;
  first_check_in_time?: string;
  first_check_in_gate?: string;
  check_in_count: number;
  created_at: string;
  updated_at: string;
}

export interface AttendanceLog {
  id: string;
  event_id: string;
  guest_id?: string;
  guest_name?: string;
  guest_category?: GuestCategory;
  guest_organization?: string;
  qr_token: string;
  gate_id: string;
  gate_name: string;
  scanner_user_id: string;
  scanner_user_name: string;
  scan_time: string;
  status: ScanResultStatus;
  notes?: string;
  device_info: string;
}

export interface EventStaff {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'Organizer' | 'Scanner Staff' | 'Security' | 'Event Manager';
  gate_id: string;
  gate_name: string;
  is_active: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_name: string;
  user_role: string;
  event_id?: string;
  action: string;
  description: string;
  timestamp: string;
}

export interface VerificationResult {
  status: ScanResultStatus;
  message: string;
  guest?: Guest;
  gate_name?: string;
  first_check_in_time?: string;
  first_check_in_gate?: string;
  scan_time: string;
}
