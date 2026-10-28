# System Context & Production Transition Plan

## 1. Project Overview
ระบบบริหารจัดการแผนกสนับสนุนทางเทคนิค (IT Support & Resource Management System) พัฒนาขึ้นเพื่อให้บริการแบบ All-in-one สำหรับองค์กร ครอบคลุม 4 โมดูลหลักภายใต้งบประมาณ 0 บาท (100% Free Tier บน Next.js, Supabase PostgreSQL, และ Vercel):
1. **Helpdesk & Maintenance**: แจ้งซ่อมพร้อมบีบอัดภาพถ่ายหน้างาน, แจ้งเตือน LINE Flex Group, รายงานสรุป KPI และตาราง Incident ละเอียดขนาด A4 แนวนอน
2. **Meeting Room & Online Booking**: จองห้องประชุมจริงและ Pool บัญชีออนไลน์ (Zoom/MS Teams) ป้องกันเวลาชนกัน 100%
3. **IT Asset Borrowing**: ยืม-คืนอุปกรณ์ไอทีหน้าเคาน์เตอร์ ติดตามสถานะและเตือน Overdue
4. **Preventive Maintenance & PM Roadmap**: เช็คลิสต์งานบำรุงรักษาประจำปีแบบกำหนดช่วงเวลาได้ (เช่น ต.ค. - ธ.ค.)

---

## 2. Production Transition Decisions (จากเซสชัน /grill-me)

### A. หน้าแรกและการเข้าใช้งาน (Login Page UI Hardening)
- **นำออกทั้งหมด**:
  - ปุ่ม ⚡ เข้าสู่ระบบ 1 คลิกทันที (User & IT Staff)
  - ปุ่ม เติมชื่อตัวอย่าง และ เติมรหัสทดสอบ
  - กล่องคำแนะนำบัญชีทดสอบด้านล่าง (Test Credentials Helper Card)
- **คงไว้**:
  - ผู้ใช้งานทั่วไป: เข้าสู่ระบบด้วยชื่อ-นามสกุลเพียงอย่างเดียว พร้อมระบบจดจำชื่ออัตโนมัติในเครื่อง (`localStorage`)
  - เจ้าหน้าที่ไอที: เข้าสู่ระบบด้วยอีเมลและรหัสผ่านทางการที่ปลอดภัย

### B. ความปลอดภัยและบัญชีผู้ดูแลระบบ (IT Staff Security Hardening)
- ปิดระบบอนุโลมรหัสผ่านทดสอบแบบ Wildcard (`emailLower.includes('admin')`)
- กำหนดบัญชีผู้ดูแลระบบหลักที่แน่นอน (เช่น `admin@company.local` หรือ `it-admin@company.local`)
- รองรับการกำหนดอีเมลและรหัสผ่านแอดมินผ่าน Environment Variables (`NEXT_PUBLIC_ADMIN_EMAIL`, `ADMIN_PASSWORD`)

### C. ข้อมูลตั้งต้นระบบ (Master Data & Starter Assets)
- **ห้องประชุม, แผนก, หมวดหมู่ปัญหา, แม่แบบ PM**: คงชุดข้อมูลพื้นฐานที่จำเป็นไว้ เพื่อให้พร้อมเปิดใช้งานได้ทันที
- **อุปกรณ์ไอทียืม-คืน (Assets)**: คงชุดอุปกรณ์เริ่มต้น (Starter Kit) ไว้ เพื่อให้แอดมินสามารถเข้าไปแก้ไขชื่อ/รหัสครุภัณฑ์จริง หรือเลือกลบรายการที่ไม่ใช้งานได้เองผ่านหน้าจัดการ

### D. การเตรียมความพร้อมสำหรับการขึ้นระบบจริง (Deployment Readiness)
- จัดเตรียมไฟล์ `.env.example` สำหรับระบุค่าเชื่อมต่อ Supabase, LINE Messaging API, และรหัสผ่านแอดมิน
- จัดเตรียมคู่มือ `PRODUCTION_DEPLOY.md` สรุปขั้นตอนการผูกฐานข้อมูล Supabase และการขึ้น Production บน Vercel Free Tier แบบ Step-by-Step

### E. โครงสร้างองค์กรและสถานที่ตั้ง (Divisions, Departments & Location Hierarchy)
- **กองงาน (Divisions)**: เพิ่มการจัดการกองงาน (เช่น กองการเงิน, สำนักบริหารกลาง, กองการเจ้าหน้าที่, ศูนย์ไอที)
- **แผนก / ฝ่าย (Departments)**: สังกัดอยู่ภายใต้กองงาน (Parent-Child) พร้อมระบุข้อมูลสถานที่ประจำ ได้แก่ อาคาร (Building), ชั้น (Floor), และห้อง (Room)
- **การแจ้งซ่อม (Helpdesk Form & Ticket Flow)**:
  - ผู้ใช้งานเลือก กองงาน -> ตัวเลือกแผนกจะกรองตามกองงานที่เลือก
  - เมื่อเลือกแผนก ระบบจะดึงและแสดงข้อมูล อาคาร, ชั้น, ห้อง ขึ้นมาให้อัตโนมัติ พร้อมมีช่องให้ระบุหมายเลขโต๊ะหรือจุดสังเกตเพิ่มเติม
  - จดจำ กองงาน และ แผนก ลงใน `localStorage` คู่กับชื่อผู้ใช้เพื่อความสะดวกในการเข้าใช้งานครั้งต่อไป
- **หน้าจัดการข้อมูลหลัก (Master Data Settings)**:
  - จัดเป็น 3 แถบเมนู: "กองงาน (Divisions)", "แผนก / ฝ่าย (Departments)" (พร้อมช่องระบุสังกัดกองงาน, อาคาร, ชั้น, ห้อง), และ "หมวดหมู่ปัญหา (Categories)" รองรับการ เพิ่ม, แก้ไข, และ ลบ
- **การรองรับทั้งระบบ (Cross-System Support)**:
  - Ticket Details, Admin Dashboard, Walk-in Asset Borrowing, และ Monthly Incident Report / CSV Export รองรับการแสดงผลและบันทึก กองงาน, แผนก, และสถานที่ตั้งครบถ้วน
  - LINE Flex Notification ระบุกองงาน แผนก ชั้น และห้อง เพื่อให้ช่างไอทีเข้าถึงจุดเกิดเหตุได้ทันที

---

## 3. สภาพแวดล้อมและเทคโนโลยี
- **Frontend / Fullstack**: Next.js 16 (App Router), React 19, Tailwind CSS
- **Database / Backend**: Supabase (PostgreSQL 15+ พร้อม B-Tree GiST Extension สำหรับ Concurrency Booking Lock)
- **Push Notification**: LINE Messaging API (Flex Messages) พร้อม Fallback อัตโนมัติ
- **Hosting**: Vercel Free Tier (Serverless & Edge CDN)
- **Testing**: Vitest (Unit & Integration tests)
