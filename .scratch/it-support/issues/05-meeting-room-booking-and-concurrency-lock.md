# 05: Meeting Room & Online Account Booking with Concurrency Lock

**What to build:**
An interactive meeting room and online account booking system backed by a PostgreSQL Exclusion Constraint to guarantee zero double-bookings. Users can inspect room availability on an interactive calendar, book physical rooms or corporate online accounts (Zoom/Teams), request required IT equipment via a checklist, and immediately receive static meeting links and passcodes for online rooms. Concurrent attempts to book overlapping slots on the same room are automatically rejected with a conflict error.

**Blocked by:** 01: Project Foundation & Dual Authentication Seam

**Status:** ready-for-agent

- [ ] Database schema for `rooms` (`id`, `name`, `type`, `capacity`, `static_url`, `passcode`, `is_active`) and `bookings` (`id`, `user_id`, `room_id`, `title`, `start_time`, `end_time`, `required_equipment`, `status`, `created_at`)
- [ ] PostgreSQL Exclusion Constraint enabled with `btree_gist` extension on `(room_id WITH =, tsrange(start_time, end_time) WITH &&)` to enforce zero overlapping reservations at the database engine level
- [ ] Interactive Calendar view (FullCalendar) showing day/week/month availability for physical rooms and online video conference accounts
- [ ] Booking creation form with date, start/end time, agenda, and IT equipment checkboxes (e.g. Projector, Mic, Zoom recording)
- [ ] Instant presentation of static room URL and passcode upon successful online booking
- [ ] Concurrency handling: API returns clean HTTP 409 Conflict when overlapping slot is submitted
- [ ] LINE group notification sent upon new booking to notify IT of required equipment preparations
- [ ] Integration test verifying successful booking in empty slot and rejection with conflict error on overlapping submission
