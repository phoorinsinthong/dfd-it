# 01: Project Foundation & Dual Authentication Seam

**What to build:**
A functional Next.js App Router application with Tailwind CSS, Supabase PostgreSQL connection, and a dual-role authentication system. General Users can sign in seamlessly using their Employee ID and Phone/PIN, establishing an anonymous/custom Supabase session to access user features without remembering complex passwords. IT Staff can sign in using their administrator Email and Password to reach backend management views. Includes layout guards that route users according to their verified role and protect IT staff pages from unauthorized access.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Next.js (App Router) initialized with Tailwind CSS and responsive design setup
- [x] Supabase client integrated (`@supabase/supabase-js`, `@supabase/ssr`) with database environment configuration
- [x] Initial database migration creating `users` and `departments` tables with Role-Based Access Control (RBAC: `user` and `admin`)
- [x] Dual-role login screen providing Employee ID + Phone/PIN tab for General Users and Email + Password tab for IT Staff
- [x] General User session generation binding employee ID to Supabase session with Row Level Security (RLS) enforcement
- [x] Role-based middleware / layout guard directing General Users to user portal and IT Staff to `/admin` dashboard
- [x] Integration test at the authentication seam asserting successful login for both roles and rejection of unauthorized admin access
