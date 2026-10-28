# คู่มือการติดตั้งและขึ้นระบบใช้งานจริง (Production Deployment Guide)
## ระบบบริหารจัดการแผนกสนับสนุนทางเทคนิค (IT Support & Resource Management System)
### งบประมาณ 0 บาท (100% Free Tier Architecture)

เอกสารนี้รวบรวมขั้นตอนแบบ Step-by-Step สำหรับผู้ดูแลระบบเพื่อนำระบบขึ้นใช้งานจริง (Go-Live) บน Vercel Free Tier ร่วมกับ Supabase PostgreSQL และ LINE Messaging API

---

## สรุปสถาปัตยกรรม 100% Free Tier

| บริการ | ขอบเขตการใช้งานฟรี (Free Tier Quota) | หน้าที่ในระบบ |
| :--- | :--- | :--- |
| **Vercel** | • แบนด์วิดท์ 100 GB/เดือน<br>• Edge CDN ทั่วโลก<br>• SSL อัตโนมัติฟรี | โฮสต์ Web Application & Next.js App Router |
| **Supabase** | • ฐานข้อมูล PostgreSQL ขนาด 500 MB<br>• Storage เก็บรูปภาพ 1 GB<br>• 50,000 Monthly Active Users | จัดเก็บข้อมูลระบบทั้งหมด, Exclusion Constraint ตรวจเวลาจองชน |
| **LINE Developers** | • Messaging API 200 ข้อความฟรี/เดือน<br>• Flex Message Cards พร้อมปุ่มกด PWA | แจ้งเตือนงานซ่อมเร่งด่วนเข้า LINE Group ของทีมไอที |

---

## ขั้นตอนที่ 1: ติดตั้งฐานข้อมูลบน Supabase

1. ไปที่ [Supabase.com](https://supabase.com) แล้วสร้างบัญชีผู้ใช้ใหม่ (หรือล็อกอินด้วย GitHub)
2. คลิก **"New Project"**
   - **Name**: `it-support-system`
   - **Database Password**: ตั้งรหัสผ่านที่ปลอดภัยและจดบันทึกไว้
   - **Region**: เลือก `Singapore (ap-southeast-1)` เพื่อความเร็วสูงสุดในไทย
   - เลือก **Free Tier Plan ($0/month)**
3. เมื่อสร้างฐานข้อมูลเสร็จแล้ว ไปที่เมนู **SQL Editor** ด้านซ้าย
4. เปิดไฟล์ [`supabase/migrations/001_initial_schema.sql`](file:///Users/superman/Desktop/แผนกสนับสนุนเทคนิค/supabase/migrations/001_initial_schema.sql) ในโปรเจกต์นี้ คัดลอกโค้ดทั้งหมดแล้ววางลงใน SQL Editor ของ Supabase จากนั้นกด **"Run"**
   - คำสั่งนี้จะสร้างตาราง `divisions`, `departments`, `users`, `categories`, `tickets`, `rooms`, `bookings`, `assets`, `borrow_logs`, `checklists` และเปิดใช้ Extension `btree_gist`
5. ไปที่เมนู **Project Settings -> API** เพื่อคัดลอกค่า:
   - `Project URL` (นำไปใส่ใน `NEXT_PUBLIC_SUPABASE_URL`)
   - `anon public key` (นำไปใส่ใน `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

---

## ขั้นตอนที่ 2: ตั้งค่า LINE Messaging API (แจ้งเตือนเข้ากลุ่มไอที)

1. เข้าไปที่ [LINE Developers Console](https://developers.line.biz)
2. สร้าง **Provider** (เช่น ชื่อองค์กรของคุณ)
3. สร้าง **Create a Messaging API channel**
   - ตั้งชื่อ Channel เช่น `IT Support Alert`
   - หมวดหมู่: IT / Software
4. ในแท็บ **Messaging API**:
   - ออกรหัส **Channel access token (long-lived)** และคัดลอกไว้
5. เชิญ LINE Bot นี้เข้ากลุ่ม LINE ของทีมช่างไอที
6. นำ `Group ID` ของกลุ่มมาใส่ในตัวแปร `LINE_ADMIN_GROUP_ID`

---

## ขั้นตอนที่ 3: ขึ้นระบบบน Vercel (Deploy to Production)

1. Push โค้ดขึ้น GitHub Repository (Private Repository)
2. ไปที่ [Vercel.com](https://vercel.com) แล้วล็อกอินด้วย GitHub
3. คลิก **"Add New Project"** และเลือก Repository นี้
4. ในส่วน **Environment Variables** ให้กรอกตัวแปรตามตัวอย่างใน [`.env.example`](file:///Users/superman/Desktop/แผนกสนับสนุนเทคนิค/.env.example):

| Variable Name | Example Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | `https://your-it-support.vercel.app` | โดเมนของระบบ |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | URL ของ Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Anon Public Key ของ Supabase |
| `LINE_CHANNEL_ACCESS_TOKEN` | `xxxxxx...` | Access Token ของ LINE Bot |
| `LINE_ADMIN_GROUP_ID` | `Cxxxxxx...` | รหัสกลุ่มไลน์ของช่างไอที |
| `NEXT_PUBLIC_ADMIN_EMAIL` | `admin@company.local` | อีเมลหลักสำหรับผู้ดูแลระบบ |
| `ADMIN_PASSWORD` | `YourSafePassword2026!` | รหัสผ่านผู้ดูแลระบบ |

5. คลิก **"Deploy"** ระบบจะทำการ Build และออนไลน์ให้ทันทีภายใน 1-2 นาที

---

## ขั้นตอนที่ 4: การเข้าใช้งานหลังขึ้นระบบ

- **สำหรับพนักงานทั่วไป (General Users)**:
  - เข้าผ่านหน้าหลัก `https://your-domain.vercel.app`
  - กรอกชื่อ-นามสกุลของคุณ แล้วกดปุ่ม **"เข้าใช้งานระบบแจ้งซ่อมและจองห้อง"** ได้ทันที
  - สามารถกด *"Add to Home Screen"* บนมือถือเพื่อใช้งานเสมือนแอปพลิเคชัน (PWA)
- **สำหรับเจ้าหน้าที่ฝ่ายไอที (IT Staff / Administrators)**:
  - สลับไปที่แท็บ **"เจ้าหน้าที่ไอที"**
  - ล็อกอินด้วยอีเมลและรหัสผ่านที่คุณตั้งค่าไว้ใน Environment Variables (`NEXT_PUBLIC_ADMIN_EMAIL` และ `ADMIN_PASSWORD`)
  - เข้าใช้งานเมนูบริหารจัดการข้อมูลหลัก (กองงาน, แผนก, หมวดหมู่ปัญหา), การยืม-คืนอุปกรณ์, แผนงานบำรุงรักษาเชิงป้องกัน (PM Roadmap) และออกรายงานประจำเดือน A4 แนวนอน
