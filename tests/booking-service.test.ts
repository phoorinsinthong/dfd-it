import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRooms,
  getRoomById,
  createBooking,
  getBookingsByDateRange,
  getUserBookings,
  cancelBooking,
  resetBookingStore,
} from '@/lib/services/booking-service';

describe('Ticket 05: Meeting Room & Online Account Booking Service', () => {
  beforeEach(() => {
    resetBookingStore();
  });

  describe('Room Discovery', () => {
    it('retrieves active physical rooms and online video conference accounts', async () => {
      const rooms = await getRooms();
      expect(rooms.length).toBeGreaterThanOrEqual(4);

      const onsiteRooms = rooms.filter((r) => r.type === 'onsite');
      const onlineRooms = rooms.filter((r) => r.type === 'online');

      expect(onsiteRooms.length).toBeGreaterThan(0);
      expect(onlineRooms.length).toBeGreaterThan(0);

      // Verify online room has static URL and passcode
      const zoomRoom = onlineRooms.find((r) => r.name.includes('Zoom'));
      expect(zoomRoom?.static_url).toBeDefined();
      expect(zoomRoom?.passcode).toBeDefined();
    });
  });

  describe('Booking Creation & Immediate Online Credentials Delivery', () => {
    it('creates booking on available slot and immediately returns meeting URL for online room', async () => {
      const rooms = await getRooms();
      const zoomPool = rooms.find((r) => r.type === 'online')!;

      const res = await createBooking({
        userId: 'usr_emp001',
        userName: 'สมศรี มีสุข',
        userDepartment: 'HR',
        roomId: zoomPool.id,
        title: 'สัมภาษณ์ผู้สมัครงานตำแหน่ง IT Support',
        startTime: '2026-11-01T09:00:00.000Z',
        endTime: '2026-11-01T10:00:00.000Z',
        requiredEquipment: ['Zoom Recording'],
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.status).toBe('confirmed');
      expect(res.data?.room_static_url).toBe(zoomPool.static_url);
      expect(res.data?.room_passcode).toBe(zoomPool.passcode);
    });

    it('rejects booking when start_time is greater than or equal to end_time', async () => {
      const rooms = await getRooms();
      const room = rooms[0];

      const res = await createBooking({
        userId: 'usr_emp001',
        userName: 'สมศรี มีสุข',
        roomId: room.id,
        title: 'ประชุมด่วน',
        startTime: '2026-11-01T11:00:00.000Z',
        endTime: '2026-11-01T10:00:00.000Z', // invalid
        requiredEquipment: [],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/end time must be after start time/i);
    });
  });

  describe('PostgreSQL Exclusion Constraint & Concurrency Lock (Zero Double Booking)', () => {
    it('rejects overlapping booking on the same room with 409 Conflict', async () => {
      const rooms = await getRooms();
      const physicalRoom = rooms.find((r) => r.type === 'onsite')!;

      // Initial booking 10:00 - 11:00
      const firstBooking = await createBooking({
        userId: 'usr_userA',
        userName: 'User A',
        roomId: physicalRoom.id,
        title: 'ประชุมวางแผนไตรมาส 4',
        startTime: '2026-11-02T10:00:00.000Z',
        endTime: '2026-11-02T11:00:00.000Z',
        requiredEquipment: ['Projector'],
      });
      expect(firstBooking.success).toBe(true);

      // Attempt 1: Partial overlap right (10:30 - 11:30) -> MUST CONFLICT
      const overlapRight = await createBooking({
        userId: 'usr_userB',
        userName: 'User B',
        roomId: physicalRoom.id,
        title: 'ประชุมเร่งด่วน',
        startTime: '2026-11-02T10:30:00.000Z',
        endTime: '2026-11-02T11:30:00.000Z',
        requiredEquipment: [],
      });
      expect(overlapRight.success).toBe(false);
      expect(overlapRight.conflict).toBe(true);
      expect(overlapRight.error).toMatch(/timeslot.*already booked|conflict/i);

      // Attempt 2: Partial overlap left (09:30 - 10:30) -> MUST CONFLICT
      const overlapLeft = await createBooking({
        userId: 'usr_userC',
        userName: 'User C',
        roomId: physicalRoom.id,
        title: 'ประชุมทีม',
        startTime: '2026-11-02T09:30:00.000Z',
        endTime: '2026-11-02T10:30:00.000Z',
        requiredEquipment: [],
      });
      expect(overlapLeft.success).toBe(false);
      expect(overlapLeft.conflict).toBe(true);

      // Attempt 3: Completely enclosing (09:00 - 12:00) -> MUST CONFLICT
      const enclosing = await createBooking({
        userId: 'usr_userD',
        userName: 'User D',
        roomId: physicalRoom.id,
        title: 'สัมมนาใหญ่',
        startTime: '2026-11-02T09:00:00.000Z',
        endTime: '2026-11-02T12:00:00.000Z',
        requiredEquipment: [],
      });
      expect(enclosing.success).toBe(false);
      expect(enclosing.conflict).toBe(true);

      // Attempt 4: Adjacent slot (11:00 - 12:00) on same room -> MUST SUCCEED
      const adjacent = await createBooking({
        userId: 'usr_userE',
        userName: 'User E',
        roomId: physicalRoom.id,
        title: 'ประชุมถัดไป',
        startTime: '2026-11-02T11:00:00.000Z',
        endTime: '2026-11-02T12:00:00.000Z',
        requiredEquipment: [],
      });
      expect(adjacent.success).toBe(true);

      // Attempt 5: Same timeslot (10:00 - 11:00) but on DIFFERENT room -> MUST SUCCEED
      const otherRoom = rooms.find((r) => r.id !== physicalRoom.id)!;
      const otherRoomBooking = await createBooking({
        userId: 'usr_userF',
        userName: 'User F',
        roomId: otherRoom.id,
        title: 'ประชุมอีกห้อง',
        startTime: '2026-11-02T10:00:00.000Z',
        endTime: '2026-11-02T11:00:00.000Z',
        requiredEquipment: [],
      });
      expect(otherRoomBooking.success).toBe(true);
    });

    it('frees timeslot when booking is cancelled so another user can book', async () => {
      const rooms = await getRooms();
      const room = rooms[0];

      const booked = await createBooking({
        userId: 'usr_user1',
        userName: 'User 1',
        roomId: room.id,
        title: 'ประชุมบ่าย',
        startTime: '2026-11-03T13:00:00.000Z',
        endTime: '2026-11-03T14:00:00.000Z',
        requiredEquipment: [],
      });
      expect(booked.success).toBe(true);

      // Cancel booking
      const cancelRes = await cancelBooking(booked.data!.id, 'usr_user1');
      expect(cancelRes.success).toBe(true);

      // Now another user books the exact same slot -> MUST SUCCEED
      const rebook = await createBooking({
        userId: 'usr_user2',
        userName: 'User 2',
        roomId: room.id,
        title: 'ประชุมแทนที่',
        startTime: '2026-11-03T13:00:00.000Z',
        endTime: '2026-11-03T14:00:00.000Z',
        requiredEquipment: [],
      });
      expect(rebook.success).toBe(true);
      expect(rebook.data?.status).toBe('confirmed');
    });
  });
});
