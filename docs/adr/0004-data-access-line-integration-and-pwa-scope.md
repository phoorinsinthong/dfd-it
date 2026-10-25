# ADR 0004: การจัดการข้อมูลหลัก การเชื่อมต่อ LINE Flex Message และขอบเขต PWA (Data Access, LINE Integration & PWA Scope)

- **สถานะ (Status)**: Accepted
- **วันที่ (Date)**: 2026-10-25
- **อ้างอิงจากการตัดสินใจ (Decided in)**: Round 3 Grilling

## บริบท (Context)
กำหนดแนวทางการจัดการข้อมูล Master Data, รูปแบบข้อความแจ้งเตือนผ่าน LINE Messaging API, เครื่องมือเข้าถึงฐานข้อมูลใน Next.js และขอบเขตการทำงานแบบ PWA

## การตัดสินใจ (Decision)

### 1. การจัดการข้อมูลหลัก (Master Data & Department Settings)
- ประเภทปัญหาการแจ้งซ่อม (เช่น Hardware, Software, Network, CCTV, อื่นๆ) และรายชื่อแผนก (เช่น HR, บัญชี, การตลาด, ปฏิบัติการ) ถูกจัดเก็บเป็น Master Data ในฐานข้อมูล
- หน้าฟอร์มจะดึงเป็น Dropdown เพื่อความถูกต้องและเป็นมาตรฐานของข้อมูลในการทำรายงาน
- มีหน้า Admin Settings สำหรับเจ้าหน้าที่ IT ในการเพิ่ม ลบ หรือแก้ไขข้อมูลหลักได้ตลอดเวลา

### 2. รูปแบบการแจ้งเตือน (LINE Flex Message with Deep Links)
- การแจ้งเตือนเข้า LINE Group ของทีม IT จะส่งในรูปแบบ **LINE Flex Message (การ์ด UI)**
- แสดงข้อมูลสำคัญครบถ้วน: รหัสงาน, หัวข้อ, ผู้แจ้ง, แผนก, สถานที่, และระดับความเร่งด่วน
- มีปุ่ม Action ด้านล่างเพื่อเปิด **PWA Deep Link** ไปยังหน้ารายละเอียดงาน หรือปุ่มกดรับงานได้ทันที

### 3. ชุดเครื่องมือเข้าถึงข้อมูล (Supabase Client on Next.js App Router)
- ใช้ **`@supabase/supabase-js` ร่วมกับ `@supabase/ssr`** เป็น Client หลัก
- ใช้ TypeScript Types ที่สร้างจาก Database Schema โดยตรง ไม่ใช้ ORM ขนาดใหญ่ (เช่น Prisma) เพื่อความเร็วและลด Overhead บน Vercel Serverless Function
- รองรับ Supabase Realtime สำหรับการอัปเดตปฏิทินห้องประชุมและการแจ้งเตือนหน้า Dashboard แบบสดๆ

### 4. ขอบเขต PWA ในเฟสแรก (App Shell Caching Only)
- Service Worker จะทำ Caching เฉพาะ App Shell (HTML, CSS, JS, Icons) เพื่อให้เปิดแอปได้ทันทีเสมือน Native App
- การทำธุรกรรม (ส่งคำขอแจ้งซ่อม, บันทึกการจอง, บันทึกการยืม-คืน) กำหนดให้ต้องมีสัญญาณอินเทอร์เน็ตที่พร้อมใช้งาน (หากไม่มีสัญญาณจะแสดงแบนเนอร์แจ้งเตือนให้อนุญาตต่อเน็ตก่อนบันทึก)
