# 03: Helpdesk Ticket Submission & Client-Side Image Compression

**What to build:**
A mobile-friendly repair request form where General Users can select their department and problem category from dropdowns, enter issue details and location, take or upload a photo with automatic client-side compression (under 800KB WebP) before uploading to Supabase Storage, and submit the ticket. Users can view their active tickets on their personal dashboard and cancel a request while it is still in `Pending` status.

**Blocked by:** 01: Project Foundation & Dual Authentication Seam, 02: Master Data Management (Departments & Categories)

**Status:** ready-for-agent

- [ ] Database schema for `tickets` (`id`, `user_id`, `category_id`, `description`, `location`, `image_url`, `status`, `assigned_to`, `solution_note`, `created_at`, `resolved_at`) with initial status default `pending`
- [ ] Supabase Storage bucket `ticket-attachments` configured with proper RLS upload permissions
- [ ] Client-side image compression utility converting mobile camera captures to WebP format under 800KB before upload
- [ ] User repair request form with Department, Category, Description, Location, and Image attachment fields
- [ ] General User dashboard view displaying user's active tickets with status badges (`Pending`, `In Progress`, `Resolved`, `Cancelled`)
- [ ] Cancel action available on user dashboard strictly when status is `Pending`
- [ ] Integration test asserting valid ticket submission with image attachment and verifying user cancellation transitions status to `Cancelled`
