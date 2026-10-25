# 06: IT Asset Inventory & Walk-in Borrow/Return Management

**What to build:**
A dedicated IT Asset Inventory and Walk-in Borrow/Return tracking system for IT Staff. Technicians can register and manage hardware items (laptops, projectors, adapters, printers) with unique asset tags and status (`Available`, `Borrowed`, `Maintenance`). When an employee walks in to borrow equipment, the technician records borrower details, department, expected return date, and machine condition, instantly flipping the asset status to `Borrowed`. Upon return, the technician checks in the device and returns it to `Available`. Assets that are overdue past the expected return date are highlighted with red warning indicators on the dashboard.

**Blocked by:** 01: Project Foundation & Dual Authentication Seam, 02: Master Data Management (Departments & Categories)

**Status:** done

- [x] Database schema for `assets` (`id`, `asset_code`, `name`, `category`, `status`, `created_at`) and `borrow_logs` (`id`, `asset_id`, `borrower_name`, `borrower_dept_id`, `borrow_date`, `expected_return_date`, `actual_return_date`, `staff_id`, `condition_out`, `condition_in`, `notes`)
- [x] IT Staff Inventory Management view with search, filter, and asset registration controls
- [x] Walk-in Loan desk interface: select available asset, enter borrower name/dept, set return date, and record checkout condition
- [x] Atomic status transition updating asset to `Borrowed` upon saving the loan transaction
- [x] Check-in Return interface: select active loan, record check-in date and return condition, flipping asset status back to `Available`
- [x] Overdue computation and visual dashboard warning badge for loans with `actual_return_date IS NULL` and `expected_return_date < CURRENT_DATE`
- [x] Integration test verifying loan transaction sets asset to `Borrowed`, return sets asset to `Available`, and overdue query returns expected records
