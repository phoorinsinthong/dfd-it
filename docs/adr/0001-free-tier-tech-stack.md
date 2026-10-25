# ADR 0001: การเลือกชุดเทคโนโลยี (Tech Stack) และสถาปัตยกรรม 0 บาท (Free Tier)

- **สถานะ (Status)**: Proposed / Accepted
- **วันที่ (Date)**: 2026-10-25
- **ผู้มีส่วนได้ส่วนเสีย (Deciders)**: ผู้พัฒนาและฝ่ายสนับสนุนเทคนิค

## บริบท (Context)
ระบบบริหารจัดการแผนกสนับสนุนทางเทคนิค (IT Support & Resource Management System) ต้องการระบบที่เสถียร รองรับการใช้งานทั้งบนคอมพิวเตอร์และสมาร์ตโฟน มีฐานข้อมูลแบบ Relational ที่รองรับการตรวจสอบการจองเวลาชนกัน รายงาน A4 แนวนอน และมีระบบแจ้งเตือนแบบทันที โดยมีข้อจำกัดสำคัญคือ **ใช้งบประมาณ 0 บาท (100% Free Tier)**

## การตัดสินใจ (Decision)
1. **Frontend / Application Framework**: Next.js (React) + Tailwind CSS รูปแบบ PWA (Progressive Web App) เพื่อให้สามารถติดตั้ง Add to Home Screen บนอุปกรณ์พกพาได้โดยไม่ต้องผ่าน App Store/Play Store
2. **Hosting Platform**: Vercel (Hobby Free Tier)
3. **Database & Auth & Storage**: Supabase (PostgreSQL Free Tier)
   - Database: PostgreSQL สำหรับจัดการข้อมูลเชิงสัมพันธ์และ Concurrency Constraint
   - Auth: จัดการสิทธิ์การเข้าถึง (RBAC: General User vs IT Staff)
   - Storage: จัดเก็บไฟล์ภาพประกอบการแจ้งซ่อมและไฟล์ลายเซ็นดิจิทัล
4. **Notifications**: LINE Messaging API ร่วมกับ Webhook หรือสำรองด้วย Telegram Bot เพื่อการแจ้งเตือนทันที

## ผลกระทบ (Consequences)
- **ข้อดี**:
  - ไม่มีค่าใช้จ่ายรายเดือนหรือค่า License
  - PostgreSQL รองรับ ACID transactions และ Time Range overlap validation (`EXCLUDE USING gist`) ป้องกันการจองห้องชนกันได้สมบูรณ์
  - PWA ประหยัดต้นทุนการพัฒนาและ deploy สะดวก
- **ข้อควรระวัง/ข้อจำกัดของ Free Tier**:
  - Supabase Free Tier จะ pause database หากไม่มีการใช้งานติดต่อกัน 7 วัน (ต้องมี health-check หรือใช้งานต่อเนื่อง)
  - พื้นที่ Supabase Storage ให้ 1GB (ต้องควบคุมขนาดรูปภาพด้วย Client-side compression)
  - โควตา Push Message ของ LINE Messaging API บน Free Tier จำกัด 200–500 ข้อความ/เดือน
