import { Room, Booking, BookingStatus } from '@/types/database';

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

export interface CreateBookingInput {
  userId: string;
  userName?: string;
  userDepartment?: string;
  roomId: string;
  title: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  requiredEquipment?: string[];
}

let roomsStore: Room[] = [...INITIAL_ROOMS];
let bookingsStore: Booking[] = [];

export function resetBookingStore() {
  roomsStore = [...INITIAL_ROOMS];
  bookingsStore = [];
}

export async function getRooms(): Promise<Room[]> {
  return roomsStore.filter((r) => r.is_active);
}

export async function getRoomById(roomId: string): Promise<Room | null> {
  const room = roomsStore.find((r) => r.id === roomId);
  return room ? { ...room } : null;
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

  // PostgreSQL Exclusion Constraint Simulation:
  // EXCLUDE USING gist (room_id WITH =, tstzrange(start_time, end_time) WITH &&)
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
    title: input.title.trim() || 'Meeting',
    start_time: new Date(input.startTime).toISOString(),
    end_time: new Date(input.endTime).toISOString(),
    required_equipment: input.requiredEquipment || [],
    status: 'confirmed',
    created_at: new Date().toISOString(),
  };

  bookingsStore.unshift(newBooking);

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
  return bookingsStore.filter((b) => b.user_id === userId);
}

export async function getAllBookings(): Promise<Booking[]> {
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
  return { success: true };
}
