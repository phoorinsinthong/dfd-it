# 04: IT Ticket Resolution & LINE Group Notification Adapter

**What to build:**
A comprehensive IT Staff Helpdesk Inbox and lifecycle management system paired with an automatic LINE Messaging API notification adapter. When a user submits a ticket, a formatted LINE Flex Message card with PWA deep links is posted to the IT team group. IT Staff can review tickets, filter by department or status, click "Accept Ticket" (`Pending` -> `In Progress`) to assign themselves as the technician (which blocks the user from cancelling), record root cause and solution notes, and mark the ticket as `Resolved`.

**Blocked by:** 03: Helpdesk Ticket Submission & Client-Side Image Compression

**Status:** done

- [x] LINE Messaging API webhook/push service sending Flex Message cards (with title, department, urgency, and direct PWA action deep link) to the IT team LINE group on new ticket creation
- [x] Notification fallback handler (logging/alerting or Telegram/Email fallback) if LINE monthly push quota is reached
- [x] IT Staff Helpdesk Inbox view displaying all tickets with search and filter controls (by status, department, and date)
- [x] Ticket acceptance workflow: IT Staff clicks "Accept" to update status to `In Progress` and assign `assigned_to`
- [x] Enforced business rule: General User is blocked from cancelling a ticket once status is `In Progress` (HTTP 403 / state guard)
- [x] Resolution modal: IT Staff enters solution note and root cause, transitioning status to `Resolved` with `resolved_at` timestamp
- [x] Integration test verifying state transitions `Pending` -> `In Progress` -> `Resolved` and asserting user cancellation is rejected once `In Progress`
