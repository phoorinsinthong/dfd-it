import { Room, Booking, BookingStatus, RoomType } from '@/types/database';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export const INITIAL_ROOMS: Room[] = [
  {
    id: 'room-1',
    name: 'ห้องประชุมใหญ่ ชั้น 4 (Executive Boardroom)',
    type: 'onsite',
    capacity: 25,
    location: 'อาคาร A ชั้น 4',
    is_active: true,
  },
  {
    id: 'room-2',
    name: 'ห้องประชุมย่อย 1 (Meeting Room 1)',
    type: 'onsite',
    capacity: 10,
    location: 'อาคาร A ชั้น 3',
    is_active: true,
  },
  {
    id: 'room-3',
    name: 'ห้องประชุมย่อย 2 (Meeting Room 2)',
    type: 'onsite',
    capacity: 8,
    location: 'อาคาร B ชั้น 2',
    is_active: true,
  },
  {
    id: 'room-4',
    name: 'Zoom Corporate Account #1 (Pro Pool)',
    type: 'online',
    capacity: 300,
    location: 'Online Cloud Video',
    static_url: 'https://zoom.us/j/8899001122',
    passcode: 'IT7890',
    is_active: true,
  },
  {
    id: 'room-5',
    name: 'MS Teams Corporate Account #1',
    type: 'online',
    capacity: 250,
    location: 'Online Cloud Video',
    static_url: 'https://teams.microsoft.com/l/meetup-join/corp-it-01',
    passcode: 'TEAM99',
    is_active: true,
  },
];

export interface CreateRoomInput {
  name: string;
  type: RoomType;
  capacity?: number;
  location?: string;
  staticUrl?: string;
  passcode?: string;
}

export interface UpdateRoomInput {
  roomId: string;
  name?: string;
  type?: RoomType;
  capacity?: number;
  location?: string;
  staticUrl?: string;
  passcode?: string;
  isActive?: boolean;
}

export interface CreateBookingInput {
  userId: string;
  userName?: string;
  userDepartment?: string;
  roomId: string;
  title: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  requiredEquipment?: string[];
  isWalkin?: boolean;
  bookedByStaffId?: string;
  bookedByStaffName?: string;
  actor?: { id: string; name: string; email?: string; role: string };
}

let roomsStore: Room[] = [...INITIAL_ROOMS];
let bookingsStore: Booking[] = [];

export function resetBookingStore() {
  roomsStore = [...INITIAL_ROOMS];
  bookingsStore = [];
}

export async function getRooms(options?: { includeInactive?: boolean }): Promise<Room[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('rooms').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        roomsStore = data.map((r: {
          id: string;
          name: string;
          type: RoomType;
          capacity?: number | null;
          location?: string | null;
          static_url?: string | null;
          passcode?: string | null;
          is_active?: boolean | null;
          created_at?: string;
        }) => ({
          id: r.id,
          name: r.name,
          type: r.type || 'onsite',
          capacity: r.capacity || undefined,
          location: r.location || undefined,
          static_url: r.static_url || undefined,
          passcode: r.passcode || undefined,
          is_active: r.is_active ?? true,
          created_at: r.created_at,
        }));
      }
    } catch (e) {
      console.warn('Supabase getRooms warning:', e);
    }
  }

  if (options?.includeInactive) {
    return [...roomsStore];
  }
  return roomsStore.filter((r) => r.is_active);
}

export async function getRoomById(roomId: string): Promise<Room | null> {
  const room = roomsStore.find((r) => r.id === roomId);
  if (room) return { ...room };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle();
      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          type: data.type || 'onsite',
          capacity: data.capacity || undefined,
          location: data.location || undefined,
          static_url: data.static_url || undefined,
          passcode: data.passcode || undefined,
          is_active: data.is_active ?? true,
          created_at: data.created_at,
        };
      }
    } catch (e) {
      console.warn('Supabase getRoomById warning:', e);
    }
  }

  return null;
}

export async function createRoom(
  input: CreateRoomInput
): Promise<{ success: boolean; data?: Room; error?: string }> {
  if (!input.name?.trim()) {
    return { success: false, error: 'กรุณาระบุชื่อห้องประชุมหรือชื่อบัญชี' };
  }

  const trimmedName = input.name.trim();
  const nameExists = roomsStore.some(
    (r) => r.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (nameExists) {
    return { success: false, error: 'มีห้องประชุมหรือบัญชีออนไลน์ชื่อนี้อยู่ในระบบแล้ว' };
  }

  const newRoom: Room = {
    id: `room-${Date.now()}`,
    name: trimmedName,
    type: input.type,
    capacity: input.capacity || (input.type === 'online' ? 250 : 10),
    location: input.location?.trim() || (input.type === 'online' ? 'Online Cloud Video' : 'ไม่ระบุสถานที่'),
    static_url: input.staticUrl?.trim(),
    passcode: input.passcode?.trim(),
    is_active: true,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('rooms').insert({
        name: newRoom.name,
        type: newRoom.type,
        capacity: newRoom.capacity,
        location: newRoom.location,
        static_url: newRoom.static_url,
        passcode: newRoom.passcode,
        is_active: true,
      }).select().single();
      if (!error && data) {
        newRoom.id = data.id;
        newRoom.created_at = data.created_at;
      }
    } catch (e) {
      console.warn('Supabase createRoom warning:', e);
    }
  }

  roomsStore.push(newRoom);
  return { success: true, data: newRoom };
}

export async function updateRoom(
  input: UpdateRoomInput
): Promise<{ success: boolean; data?: Room; error?: string }> {
  const room = roomsStore.find((r) => r.id === input.roomId);
  if (!room) {
    return { success: false, error: 'ไม่พบห้องประชุมที่ต้องการแก้ไข' };
  }

  if (input.name && input.name.trim() !== room.name) {
    const trimmed = input.name.trim();
    const collision = roomsStore.some(
      (r) => r.id !== input.roomId && r.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (collision) {
      return { success: false, error: 'ชื่อห้องประชุมหรือบัญชีออนไลน์นี้ซ้ำกับรายการอื่น' };
    }
    room.name = trimmed;
  }

  if (input.type) room.type = input.type;
  if (input.capacity !== undefined) room.capacity = input.capacity;
  if (input.location !== undefined) room.location = input.location.trim();
  if (input.staticUrl !== undefined) room.static_url = input.staticUrl.trim();
  if (input.passcode !== undefined) room.passcode = input.passcode.trim();
  if (input.isActive !== undefined) room.is_active = input.isActive;

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('rooms').update({
        name: room.name,
        type: room.type,
        capacity: room.capacity,
        location: room.location,
        static_url: room.static_url,
        passcode: room.passcode,
        is_active: room.is_active,
      }).eq('id', input.roomId);
    } catch (e) {
      console.warn('Supabase updateRoom warning:', e);
    }
  }

  return { success: true, data: { ...room } };
}

export async function deleteRoom(
  roomId: string,
  options?: { force?: boolean }
): Promise<{ success: boolean; softDeleted?: boolean; message?: string; error?: string }> {
  const roomIdx = roomsStore.findIndex((r) => r.id === roomId);
  if (roomIdx === -1) {
    return { success: false, error: 'ไม่พบห้องประชุมที่ต้องการลบ' };
  }

  const hasBookings = bookingsStore.some(
    (b) => b.room_id === roomId && b.status !== 'cancelled'
  );

  if (hasBookings && !options?.force) {
    // Soft delete to protect booking records
    roomsStore[roomIdx].is_active = false;
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('rooms').update({ is_active: false }).eq('id', roomId);
      } catch (e) {
        console.warn('Supabase deleteRoom soft warning:', e);
      }
    }
    return {
      success: true,
      softDeleted: true,
      message: 'ห้องนี้มีประวัติการจองในระบบ จึงทำการปิดการใช้งาน (Soft Delete) แทนการลบถาวร',
    };
  }

  // Hard delete
  roomsStore.splice(roomIdx, 1);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('rooms').delete().eq('id', roomId);
    } catch (e) {
      console.warn('Supabase deleteRoom hard warning:', e);
    }
  }

  return { success: true, softDeleted: false };
}

export async function toggleRoomActive(
  roomId: string,
  isActive: boolean
): Promise<{ success: boolean; data?: Room; error?: string }> {
  return updateRoom({ roomId, isActive });
}

export async function createBooking(
  input: CreateBookingInput
): Promise<{ success: boolean; data?: Booking; error?: string; conflict?: boolean }> {
  const room = await getRoomById(input.roomId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  const start = new Date(input.startTime).getTime();
  const end = new Date(input.endTime).getTime();

  if (isNaN(start) || isNaN(end)) {
    return { success: false, error: 'Invalid date/time format' };
  }

  if (start >= end) {
    return { success: false, error: 'End time must be after start time' };
  }

  // Fetch recent bookings from Supabase if configured to ensure no collision
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('room_id', input.roomId)
        .neq('status', 'cancelled');
      if (data) {
        bookingsStore = data as Booking[];
      }
    } catch (e) {
      console.warn('Supabase check booking overlap warning:', e);
    }
  }

  // Two ranges [startA, endA) and [startB, endB) overlap iff startA < endB && endA > startB
  const hasConflict = bookingsStore.some((b) => {
    if (b.room_id !== input.roomId || b.status === 'cancelled') {
      return false;
    }
    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    return start < bEnd && end > bStart;
  });

  if (hasConflict) {
    return {
      success: false,
      conflict: true,
      error: 'Timeslot is already booked for this room (PostgreSQL Exclusion Constraint Conflict: 409)',
    };
  }

  const newBooking: Booking = {
    id: `BK-${Date.now().toString().slice(-6)}`,
    user_id: input.userId,
    user_name: input.userName || 'Employee',
    user_department: input.userDepartment,
    room_id: room.id,
    room_name: room.name,
    room_type: room.type,
    room_static_url: room.static_url,
    room_passcode: room.passcode,
    title: input.title.trim() || (input.isWalkin ? 'Walk-in Meeting' : 'Meeting'),
    start_time: new Date(input.startTime).toISOString(),
    end_time: new Date(input.endTime).toISOString(),
    required_equipment: input.requiredEquipment || [],
    is_walkin: input.isWalkin ?? false,
    booked_by_staff_id: input.bookedByStaffId,
    booked_by_staff_name: input.bookedByStaffName,
    status: 'confirmed',
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data: dbBooking, error } = await supabase.from('bookings').insert({
        id: newBooking.id,
        user_id: newBooking.user_id,
        user_name: newBooking.user_name,
        user_department: newBooking.user_department,
        room_id: newBooking.room_id,
        room_name: newBooking.room_name,
        room_type: newBooking.room_type,
        room_static_url: newBooking.room_static_url,
        room_passcode: newBooking.room_passcode,
        title: newBooking.title,
        start_time: newBooking.start_time,
        end_time: newBooking.end_time,
        required_equipment: newBooking.required_equipment,
        is_walkin: newBooking.is_walkin,
        booked_by_staff_id: newBooking.booked_by_staff_id,
        booked_by_staff_name: newBooking.booked_by_staff_name,
        status: newBooking.status,
      }).select().single();
      if (!error && dbBooking) {
        newBooking.id = dbBooking.id;
      }
    } catch (e) {
      console.warn('Supabase createBooking warning:', e);
    }
  }

  bookingsStore.unshift(newBooking);

  if (input.actor) {
    try {
      const { recordAuditLog } = await import('./audit-log-service');
      const startFmt = new Date(newBooking.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const endFmt = new Date(newBooking.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      await recordAuditLog({
        actorId: input.actor.id,
        actorName: input.actor.name,
        actorEmail: input.actor.email,
        actorRole: input.actor.role,
        action: 'CREATE',
        module: 'BOOKING',
        targetId: newBooking.id,
        targetName: room.name,
        details: input.isWalkin
          ? `จองห้องประชุมแบบ Walk-in: "${newBooking.title}" สำหรับ ${newBooking.user_name} (${newBooking.user_department || 'ไม่ระบุแผนก'}) เวลา ${startFmt} - ${endFmt}`
          : `สร้างการจองห้องประชุม: "${newBooking.title}" สำหรับ ${newBooking.user_name} (${newBooking.user_department || '-'}) เวลา ${startFmt} - ${endFmt}`,
      });
    } catch (auditErr) {
      console.warn('Failed to record booking audit log:', auditErr);
    }
  }

  return {
    success: true,
    data: newBooking,
  };
}

export async function getBookingsByDateRange(
  startIso: string,
  endIso: string,
  roomId?: string
): Promise<Booking[]> {
  await getAllBookings();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();

  return bookingsStore.filter((b) => {
    if (b.status === 'cancelled') return false;
    if (roomId && b.room_id !== roomId) return false;

    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    return bEnd >= start && bStart <= end;
  });
}

export async function getUserBookings(userId: string): Promise<Booking[]> {
  await getAllBookings();
  return bookingsStore.filter((b) => b.user_id === userId);
}

export async function getAllBookings(): Promise<Booking[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('start_time', { ascending: true });
      if (!error && data) {
        bookingsStore = data as Booking[];
      }
    } catch (e) {
      console.warn('Supabase getAllBookings warning:', e);
    }
  }
  return [...bookingsStore];
}

export async function cancelBooking(
  bookingId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const booking = bookingsStore.find((b) => b.id === bookingId);
  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  // Allow user or admin to cancel
  if (booking.user_id !== userId && !userId.startsWith('staff_')) {
    return { success: false, error: 'Unauthorized to cancel this booking' };
  }

  booking.status = 'cancelled';

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
    } catch (e) {
      console.warn('Supabase cancelBooking warning:', e);
    }
  }

  return { success: true };
}
