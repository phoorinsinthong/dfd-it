# 07: Preventive Maintenance Annual Roadmap & Checklist Templates

**What to build:**
A Preventive Maintenance Roadmap and Checklist management module for IT Staff. Technicians can create reusable master checklist templates for standard procedures (e.g. Annual IT Audit, Townhall Event Setup, Server UPS Cleaning). Technicians can click a single button to generate the complete 12-month Annual Roadmap for a target year, view items on an interactive 12-month Timeline / Kanban view, check off completed tasks with accountability records, and track overall completion percentages via progress bars.

**Blocked by:** 01: Project Foundation & Dual Authentication Seam

**Status:** done

- [x] Database schema for `checklist_templates` (`id`, `title`, `description`, `items`), `checklists` (`id`, `title`, `year`, `target_month`, `type`, `status`), and `checklist_items` (`id`, `checklist_id`, `task_name`, `is_completed`, `completed_by`, `completed_at`)
- [x] Template Builder interface allowing IT Staff to configure reusable item lists
- [x] One-click generator action: "Generate Annual Tasks from Template" creating monthly scheduled checklists for all 12 months of a given year
- [x] Roadmap timeline view displaying monthly cards with completion statistics (e.g. 8/10 tasks = 80% progress bar)
- [x] Interactive task completion checklist: toggle item completion, recording staff identifier and timestamp
- [x] Ad-hoc checklist creator for temporary events (e.g. Office Relocation, Batch PC Setup)
- [x] Integration test asserting annual task batch generation from template and accurate progress calculation
