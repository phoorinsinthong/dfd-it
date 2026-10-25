# 08: Monthly Summary Report (A4 Landscape Print & Dual Signature)

**What to build:**
A comprehensive monthly performance reporting system and print engine. IT Staff can select a target month and year to view an aggregated summary table of resolved tickets, meeting room usage, equipment loans, and maintenance progress. The report is styled via CSS `@media print` for clean A4 Landscape paper export (with menus hidden and table page-breaks cleanly controlled). Supports dual signature: staff and supervisors can sign directly on a touch/stylus canvas to embed digital signatures, or leave signature slots blank with dotted lines for wet ink pen signatures. Includes a fallback CSV/Excel export button.

**Blocked by:** 04: IT Ticket Resolution & LINE Group Notification Adapter, 05: Meeting Room & Online Account Booking with Concurrency Lock, 06: IT Asset Inventory & Walk-in Borrow/Return Management, 07: Preventive Maintenance Annual Roadmap & Checklist Templates

**Status:** ready-for-agent

- [ ] Aggregation query computing monthly ticket statistics (by category/department), room booking totals, asset loan volume, and maintenance completion rates for selected month and year
- [ ] Responsive monthly report presentation view with summary KPI cards and detailed breakdown tables
- [ ] CSS `@media print` rules enforcing `@page { size: A4 landscape; margin: 10mm; }`, hiding navigation elements, and preventing awkward row splits via `break-inside: avoid`
- [ ] Dual signature component: interactive canvas using `react-signature-canvas` with touch/stylus support, saving signature image to report state, and displaying blank dotted lines for physical pen signature when canvas is unsubmitted
- [ ] Export to CSV / Excel functionality for raw data download
- [ ] Integration test verifying accurate monthly aggregation counts and successful report view rendering
