# 02: Master Data Management (Departments & Categories)

**What to build:**
An administrative master data management interface for IT Staff to configure and maintain company Departments (e.g. HR, Accounting, Marketing) and Problem Categories (e.g. Hardware, Software, Network, CCTV). Provides centralized dropdown data queries across the application, ensuring data consistency and preventing free-text typos.

**Blocked by:** 01: Project Foundation & Dual Authentication Seam

**Status:** ready-for-agent

- [ ] Database schema for `departments` (`id`, `name`, `is_active`, `created_at`) and `categories` (`id`, `name`, `is_active`)
- [ ] Admin Settings page accessible exclusively by IT Staff to list, add, edit, and toggle active status of departments and categories
- [ ] Public helper/service function returning active departments and categories for dropdown consumption
- [ ] Inactive master records are hidden from regular user dropdowns while preserving historical references
- [ ] Integration test verifying IT Staff can mutate master data and non-admin users cannot access the management endpoints
