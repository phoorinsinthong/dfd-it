# ADR 0002: สถาปัตยกรรมความปลอดภัย การแจ้งเตือน และการจัดการข้อมูล

- **สถานะ (Status)**: Accepted
- **วันที่ (Date)**: 2026-10-25
- **อ้างอิงจากการตัดสินใจ (Decided in)**: Round 1 Grilling

## บริบท (Context)
จากการตีกรอบสถาปัตยกรรมใน Round 1 เพื่อให้ระบบทำงานได้เสถียร ปลอดภัย ไม่เกิดข้อผิดพลาดในการจองห้อง และอยู่ภายใต้เงื่อนไข Free Tier 100%

## การตัดสินใจ (Decision)
1. **การยืนยันตัวตนและการแบ่งสิทธิ์ (Authentication & RLS)**:
   - **General User**: เข้าใช้งานด้วย รหัสพนักงาน (Employee ID) + เบอร์โทรศัพท์/PIN โดยระบบจะออก Custom/Anonymous Token บน Supabase เพื่อรักษาตัวตน (Identity) และรองรับ Row Level Security (RLS) ทำให้ผู้ใช้ดึงได้เฉพาะประวัติงานแจ้งซ่อมของตนเอง และไม่สามารถแก้ไขงานของผู้อื่นได้
   - **IT Staff**: เข้าสู่ระบบด้วย Email + Password มาตรฐานผ่าน Supabase Auth เพื่อควบคุมสิทธิ์ระดับ Admin
2. **กลยุทธ์ระบบแจ้งเตือนแบบผสมผสาน (Hybrid Notification Strategy)**:
   - ช่องทางหลัก: ส่งข้อความแจ้งเตือนสรุปสั้นเข้า **LINE Group ของทีม IT** (1 push ต่องานใหม่) เพื่อประหยัดโควตา Free Tier (200–500 pushes/เดือน)
   - ช่องทางสำรอง: มีระบบสลับไปใช้ **Telegram Bot หรือ Transactional Email (Resend Free Tier 3,000 ฉบับ/เดือน)** โดยอัตโนมัติหากโควตา LINE ใกล้หมดในเดือนนั้น
3. **การป้องกันการจองห้องชนกัน (Concurrency Conflict Prevention)**:
   - บังคับใช้ PostgreSQL Exclusion Constraint ด้วยส่วนขยาย `btree_gist` บนช่วงเวลา (`tsrange`) และห้องประชุม (`room_id`) หรือใช้ Stored Procedure Transaction ในระดับฐานข้อมูล เพื่อการันตี 100% ว่าจะไม่มีการบันทึกเวลาทับซ้อนกัน แม้กดจองพร้อมกันในเสี้ยววินาที
4. **การควบคุมขนาดไฟล์สื่อ (Client-Side Media Compression)**:
   - บังคับบีบอัดรูปถ่ายแจ้งซ่อมที่เครื่องผู้ใช้ (Client-Side) ให้มีขนาดไม่เกิน 500KB - 800KB (ฟอร์แมต WebP) ก่อนอัปโหลดเข้า Supabase Storage เพื่อควบคุมโควตาความจุฟรี 1 GB ให้ใช้งานได้นานหลายปี
5. **การจัดพิมพ์รายงานและส่งออกข้อมูล (Reporting & Export)**:
   - ใช้ CSS `@media print` A4 Landscape เป็นตัวสร้างรายงานสรุปประจำเดือน ไม่ต้องมี PDF rendering server พร้อมเพิ่มปุ่มส่งออกข้อมูลเป็น CSV/Excel
