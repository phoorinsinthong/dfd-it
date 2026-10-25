---
title: "Specification: IT Support & Resource Management System (ระบบบริหารจัดการแผนกสนับสนุนทางเทคนิค)"
status: "ready-for-agent"
created_at: "2026-10-25"
author: "Antigravity Pair Programmer"
glossary_ref: "GLOSSARY.md"
adrs:
  - "docs/adr/0001-free-tier-tech-stack.md"
  - "docs/adr/0002-security-notification-and-data-architecture.md"
  - "docs/adr/0003-module-workflows-and-business-rules.md"
  - "docs/adr/0004-data-access-line-integration-and-pwa-scope.md"
---

# Specification: IT Support & Resource Management System (ระบบบริหารจัดการแผนกสนับสนุนทางเทคนิค)

## Problem Statement

ในองค์กรปัจจุบัน การดำเนินงานของฝ่ายสนับสนุนเทคนิค (IT Support) มักกระจัดกระจายและขาดความต่อเนื่อง:
1. การแจ้งซ่อมอุปกรณ์หรือปัญหาซอฟต์แวร์ทำผ่านช่องทางแชตส่วนตัวหรือการโทรศัพท์ ทำให้ตกหล่น ไม่มีประวัติการซ่อม ติดตามสถานะไม่ได้ และไม่สามารถสรุปรายงานประจำเดือนได้อย่างเป็นระบบ
2. การจองห้องประชุมและบัญชีประชุมออนไลน์ (Zoom / MS Teams) ขาดระบบป้องกันการจองซ้ำ ทำให้เกิดปัญหาเวลาชนกันและขาดแคลนอุปกรณ์สนับสนุนการประชุม
3. การยืม-คืนอุปกรณ์ไอที (โน้ตบุ๊ก, ปริ้นเตอร์, สายแปลง) ไม่มีการบันทึกสถานะแบบเรียลไทม์ ทำให้ครุภัณฑ์สูญหายหรือเกินกำหนดส่งคืนโดยไม่มีการแจ้งเตือน
4. งานบำรุงรักษาเชิงป้องกัน (Preventive Maintenance) ประจำปี เช่น การต่ออายุโดเมน/SSL, การสำรองข้อมูล และการตรวจเช็กแอร์ห้องเซิร์ฟเวอร์ มักถูกละเลยเนื่องจากไม่มี Checklist และ Roadmap ที่เห็นความคืบหน้ารวม
5. องค์กรมีข้อจำกัดด้านงบประมาณสำหรับซอฟต์แวร์ จึงต้องการโซลูชันที่เสถียร รองรับทั้งคอมพิวเตอร์และมือถือ โดยมีต้นทุนค่าลิขสิทธิ์และเซิร์ฟเวอร์ 0 บาท (100% Free Tier)

## Solution

พัฒนาเว็บแอปพลิเคชันแบบ PWA (Progressive Web App) ด้วย Next.js, Tailwind CSS และ Supabase (PostgreSQL) ที่โฮสต์ฟรีบน Vercel โดยครอบคลุม 4 โมดูลหลัก:
1. **Helpdesk & Maintenance**: ระบบแจ้งซ่อมพร้อมแนบรูปภาพที่บีบอัดอัตโนมัติบนมือถือ, การแจ้งเตือนเข้า LINE Group ของทีมไอทีแบบเรียลไทม์ และรายงานประจำเดือนขนาด A4 แนวนอนพร้อมระบบลายเซ็นดิจิทัล
2. **Meeting Room & Online Booking**: ระบบจองห้องประชุมจริงและ Pool บัญชีออนไลน์ พร้อมการันตีป้องกันเวลาชนกัน 100% ด้วย PostgreSQL Exclusion Constraint และแสดงผลผ่านปฏิทินแบบ Interactive
3. **IT Asset Borrowing**: ระบบบันทึกการยืม-คืนอุปกรณ์หน้าเคาน์เตอร์ (Walk-in Desk) พร้อมแสดงสถานะอุปกรณ์เรียลไทม์ และแถบสีเตือนอุปกรณ์ที่เกินกำหนดส่งคืน (Overdue)
4. **IT Preventive Maintenance & Task Roadmap**: ระบบสร้างและติดตาม Checklist งานประจำปี/งานเฉพาะกิจ จาก Master Template พร้อมแสดงผลความคืบหน้าแบบ Roadmap รายเดือน 12 เดือน

ระบบแยกสิทธิ์ชัดเจนระหว่าง General User (เข้าใช้งานสะดวกผ่านรหัสพนักงาน + PIN/เบอร์โทร) และ IT Staff (ล็อกอินด้วย Email + Password)

---

## User Stories

### Authentication & Authorization
1. As a General User, I want to access the application using only my Employee ID and Phone Number/PIN, so that I can submit tickets and book rooms quickly without remembering complex passwords.
2. As a General User, I want the system to remember my session via PWA, so that I don't have to re-enter my employee ID every time I open the app on my phone.
3. As an IT Staff, I want to log in with an administrator Email and Password, so that I have access to backend management tools, assets, and monthly reports.
4. As an IT Staff, I want Row Level Security (RLS) to restrict General Users from modifying other users' tickets, so that data integrity is maintained.

### Module 1: Helpdesk & Maintenance (แจ้งซ่อม)
5. As a General User, I want to fill out a repair request form with title, department dropdown, category dropdown, issue description, and desk location, so that technicians have full context before coming to fix the issue.
6. As a General User, I want to take a photo of the damaged hardware/screen using my mobile camera and attach it, so that IT staff can visually diagnose the problem.
7. As a General User on a mobile network, I want my photos to be compressed automatically on my browser before uploading, so that the upload finishes quickly and does not consume excessive cellular data.
8. As a General User, I want to see a list of my active tickets and their statuses (`Pending`, `In Progress`, `Resolved`, `Cancelled`), so that I know when IT is working on my problem.
9. As a General User, I want to cancel my ticket while it is still in `Pending` status, so that I can retract accidental or duplicate requests before IT acknowledges them.
10. As a General User, I want to be blocked from cancelling my ticket once IT has changed the status to `In Progress`, so that I don't disrupt a technician who is already resolving it.
11. As an IT Staff, I want to receive an instant LINE Flex Message in our IT team group when a new ticket is submitted, so that our team can acknowledge urgent issues immediately.
12. As an IT Staff, I want the LINE message to include a direct PWA deep link, so that clicking the notification opens the exact ticket detail in my browser.
13. As an IT Staff, I want to click an "Accept Ticket" button to transition the status from `Pending` to `In Progress` and assign myself as the technician, so that other team members know who is handling it.
14. As an IT Staff, I want to record the root cause and resolution note before setting the ticket to `Resolved`, so that the organization retains troubleshooting knowledge.
15. As an IT Staff, I want to view a monthly summary table of all resolved tickets filtered by month and year, so that I can prepare performance reports.
16. As an IT Staff, I want to print or export the monthly report in A4 Landscape format with header/navbar hidden and no awkward table page-breaks, so that it looks professional.
17. As an IT Staff, I want to sign my name on a touch/stylus signature canvas directly in the app, so that my digital signature appears on the printed report.
18. As an IT Staff, I want blank dotted signature lines for physical ink signatures if digital signature is skipped, so that managers who prefer pen signatures can sign physical copies.
19. As an IT Staff, I want to export the monthly ticket data to Excel/CSV, so that I can perform deeper spreadsheet analysis.

### Module 2: Meeting Room & Online Booking (จองห้องประชุม)
20. As a General User, I want to view an interactive calendar showing availability for all onsite rooms and online meeting accounts, so that I can identify free time slots.
21. As a General User, I want to book an onsite meeting room by specifying room, date, start time, end time, and meeting agenda, so that my team has a confirmed space.
22. As a General User, I want to book an online meeting room (Zoom / Teams pool account), so that our organization's shared video conference license is allocated to my meeting.
23. As a General User, I want to receive the static meeting URL and passcode immediately upon completing an online booking, so that I can distribute the link to attendees right away.
24. As a General User, I want to select required IT equipment (e.g. Projector, Mic, Video Conference Rig) via checkboxes, so that IT staff know what hardware to set up in advance.
25. As a General User, I want the system to prevent overlapping bookings on the same room at the exact time slot, so that two departments never show up to the same room simultaneously.
26. As an IT Staff, I want database-level concurrency locks to reject race-condition bookings, so that simultaneous clicks by multiple users never create duplicate reservations.
27. As an IT Staff, I want to receive a notification in the LINE group whenever a meeting booking is created or updated, so that I am aware of upcoming facility needs.
28. As an IT Staff, I want a daily calendar agenda view showing all booked rooms for the day, so that I can schedule pre-meeting equipment setup.

### Module 3: IT Asset Borrowing (ยืม-คืนอุปกรณ์)
29. As an IT Staff, I want to register and manage inventory of borrowable assets with asset code, name, category, and current status (`Available`, `Borrowed`, `Maintenance`), so that I have complete visibility into our inventory.
30. As an IT Staff, I want to record a walk-in borrowing log by choosing an available asset, entering borrower name, department, borrow date, expected return date, and initial physical condition, so that custody is tracked.
31. As an IT Staff, I want the system to immediately update the asset status to `Borrowed` upon saving the loan, so that it cannot be loaned out to anyone else.
32. As an IT Staff, I want to process returns by selecting the active loan record, recording return date and return condition, and flipping asset status back to `Available`, so that the asset is ready for the next borrower.
33. As an IT Staff, I want a visual red badge and dashboard filter for assets that are `Overdue`, so that I can proactively follow up with employees holding overdue equipment.

### Module 4: IT Preventive Maintenance & Roadmap (งานบำรุงรักษาและแผนงาน)
34. As an IT Staff, I want to define reusable Checklist Templates for standard recurring events (e.g. Annual IT Audit, Townhall Setup, Server Room Maintenance), so that we don't recreate task lists from scratch.
35. As an IT Staff, I want to generate a full 12-month Annual Roadmap from a template in one click for a target year, so that the team's annual schedule is established immediately.
36. As an IT Staff, I want to check off maintenance items, record who completed them, and timestamp them, so that accountability is clear.
37. As an IT Staff, I want to see an Annual Timeline / Kanban view with percentage progress bars (e.g. 8/10 items = 80%), so that leadership can immediately gauge our preventive maintenance health.
38. As an IT Staff, I want to create ad-hoc checklists for temporary one-off events (e.g. Office Relocation, New Employee Onboarding Batch), so that special projects stay organized.

### Master Data & Settings
39. As an IT Staff, I want an Admin Settings screen to add, edit, or disable Problem Categories, so that dropdown menus on the ticket form remain clean and relevant.
40. As an IT Staff, I want an Admin Settings screen to manage Company Departments, so that tickets and loan records map to official organizational units.

---

## Implementation Decisions

### 1. Modules & Boundaries
- **Auth & Session Module**: Handles Employee ID + PIN custom session generation for General Users and Supabase standard auth for IT Staff. Exposes session token and user role.
- **Helpdesk Module**: Manages ticket CRUD, state transitions, client-side WebP image compression, and status filters.
- **Booking & Calendar Module**: Manages onsite and online room availability, conflict validation, equipment checklist aggregation, and calendar data feed.
- **Asset Loan Module**: Manages hardware inventory, walk-in loan transactions, return check-in, and overdue calculation.
- **Roadmap & Checklist Module**: Manages template definitions, annual task generation, completion tracking, and timeline progress computation.
- **Reporting & Printing Module**: Aggregates monthly metrics, renders CSS print A4 landscape views, and manages touch/stylus signature inputs.
- **Notification Adapter**: Formats and dispatches LINE Flex Messages to the IT group webhook/push endpoint, with automatic fallback to Telegram/Email if quota is exhausted.

### 2. Architecture & Data Contracts
- **Framework**: Next.js (App Router) deployed on Vercel Free Tier.
- **Database**: PostgreSQL hosted on Supabase Free Tier.
- **Access Layer**: Direct Supabase TypeScript Client (`@supabase/supabase-js`, `@supabase/ssr`). No heavy ORM.
- **Concurrency Protection**: PostgreSQL Exclusion Constraint using `btree_gist` extension on `(room_id WITH =, time_slot WITH &&)` or serialized transactional stored procedure.
- **Storage**: Supabase Storage bucket `ticket-attachments` for compressed photos (< 800KB) and `signatures` for digital canvas exports.
- **Notifications**: LINE Messaging API Bot sending Flex Message cards with PWA action deep links. Fallback via Telegram Bot API or Resend Free Tier.

### 3. Database Schema (Entities & Relationships)
1. `departments`: `id`, `name`, `is_active`, `created_at`
2. `users`: `id`, `employee_id`, `name`, `department_id`, `phone`, `role` (`user` | `admin`), `created_at`
3. `categories`: `id`, `name`, `is_active`
4. `tickets`: `id`, `user_id`, `category_id`, `description`, `location`, `image_url`, `status` (`pending`, `in_progress`, `resolved`, `cancelled`), `assigned_to`, `solution_note`, `created_at`, `resolved_at`
5. `rooms`: `id`, `name`, `type` (`onsite` | `online`), `capacity`, `static_url`, `passcode`, `is_active`
6. `bookings`: `id`, `user_id`, `room_id`, `title`, `start_time`, `end_time`, `required_equipment` (JSON array), `status`, `created_at`
7. `assets`: `id`, `asset_code`, `name`, `category`, `status` (`available`, `borrowed`, `maintenance`), `created_at`
8. `borrow_logs`: `id`, `asset_id`, `borrower_name`, `borrower_dept_id`, `borrow_date`, `expected_return_date`, `actual_return_date`, `staff_id`, `condition_out`, `condition_in`, `notes`
9. `checklist_templates`: `id`, `title`, `description`, `items` (JSON array)
10. `checklists`: `id`, `title`, `year`, `target_month`, `type` (`annual` | `adhoc`), `status`
11. `checklist_items`: `id`, `checklist_id`, `task_name`, `is_completed`, `completed_by`, `completed_at`
12. `reports`: `id`, `month`, `year`, `staff_signature_url`, `manager_signature_url`, `notes`, `created_at`

---

## Testing Decisions

### What Makes a Good Test
- Tests must verify behavior through **public seams**, not internal implementation details or private helpers.
- Tests should not break upon internal refactoring if public API contracts and user-visible behaviors remain unchanged.
- Tests must use realistic independent test fixtures, avoiding tautological assertions (e.g. never test that a function returns what its own mock returns).
- Tests must execute deterministically and fast.

### Primary Testing Seams

#### Seam 1: Service / API Action Seam (High-Level Boundary)
This is the main testing surface covering end-to-end request handling, business validation, and side-effects:
- `Ticket Service Seam`: Submitting valid ticket returns ticket ID and enqueues LINE notification; transitioning `Pending` -> `Cancelled` succeeds; transitioning `In Progress` -> `Cancelled` by a general user is rejected with 403 Forbidden.
- `Booking Service Seam`: Creating a booking within free hours succeeds; **creating an overlapping booking on the same room returns 409 Conflict**.
- `Asset Service Seam`: Loaning an available asset sets status to `Borrowed`; loaning an already borrowed asset fails; returning flips status back to `Available`.
- `Roadmap Service Seam`: Cloning an annual template generates expected 12-month tasks with correct initial unchecked states.

#### Seam 2: Database Concurrency & Constraint Seam
- Direct PostgreSQL integration test against the exclusion constraint to guarantee that concurrent overlapping booking inserts cannot both commit.

---

## Out of Scope
1. Direct integration with physical PBX or telephony hardware.
2. Native iOS/Android app store packaging (the app is strictly a Progressive Web App installed via browser "Add to Home Screen").
3. Paid third-party services (all features must operate within free tiers of Vercel, Supabase, LINE, and Resend).
4. Offline background mutation queue (active internet connection is required to create or update tickets and bookings).
5. Automatic hardware discovery over local LAN (inventory is managed manually via asset codes).

---

## Further Notes
- A local task tracking directory `.scratch/issues/` will be used to hold vertical-slice tickets produced by `/to-tickets`.
- Future extensions may include single sign-on (SSO) with Microsoft Azure AD / Google Workspace if the organization later adopts enterprise cloud identity.
