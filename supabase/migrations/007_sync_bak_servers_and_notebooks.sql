-- ====================================================================
-- IT Support & Resource Management System (แผนกสนับสนุนเทคนิค กง.กห.)
-- Migration: 007_sync_bak_servers_and_notebooks.sql
-- Description: ซิงค์ข้อมูลครุภัณฑ์จริงจากฐานข้อมูล DFDEquipment (.bak)
--              1. นำเข้าเซิร์ฟเวอร์หลัก 7 เครื่อง เข้าสู่ตาราง servers (ตู้ Rack 2)
--              2. นำเข้าคอมพิวเตอร์โน้ตบุ๊ก 19 เครื่อง เข้าสู่ตาราง assets
--                 - 11 เครื่องในแผนกสนับสนุนทางเทคนิค (สถานะ available)
--                 - 8 เครื่องประจำตำแหน่ง/แผนกอื่น (สถานะ borrowed)
--              3. บันทึกข้อมูลการถือครองลงตาราง borrow_logs
--
-- วิธีใช้: คัดลอกโค้ดทั้งหมดนี้ไปวางในหน้า Supabase SQL Editor แล้วกด "Run"
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. นำเข้าเซิร์ฟเวอร์หลัก 7 เครื่อง (DFD Enterprise Servers) ลงตู้ Rack 2
-- --------------------------------------------------------------------
INSERT INTO public.servers (
  id, name, environment, rack_id, rack_name, unit_position, unit_size,
  ip_address, ilo_ip, specs, username, password, role_purpose, status, notes, is_active
) VALUES
  (
    'srv-dfd-eslip',
    'DFD-SRV-ESLIP',
    'internal',
    'rack-2',
    'Rack 2 (Storage & Virtualization)',
    29,
    2,
    '192.168.10.31',
    '192.168.10.231',
    '{"brand_model": "SUPERMICRO 825-7 (7440.001.0001.0007.7)", "cpu": "2x Intel Xeon E5-2600 v2 (16 Cores)", "ram": "64 GB DDR3 ECC", "storage": "8x 600GB SAS 15K RAID 10", "os": "CentOS Linux 7 / Oracle DB"}'::jsonb,
    'root',
    'EslipServer!2026',
    'ระบบใบจ่ายเงินเดือนอิเล็กทรอนิกส์ (e-Slip) กรมการเงินกลาโหม',
    'online',
    'ให้บริการระบบ e-Slip ตรวจสอบสลิปเงินเดือนกำลังพล กรมการเงินกลาโหม (กกมง.ฯ)',
    true
  ),
  (
    'srv-dfd-payroll',
    'DFD-SRV-PAYROLL',
    'internal',
    'rack-2',
    'Rack 2 (Storage & Virtualization)',
    28,
    1,
    '192.168.10.32',
    '192.168.10.232',
    '{"brand_model": "IBM SYSTEM x3550-M4 (7440.001.0001.0006.7)", "cpu": "2x Intel Xeon E5-2640 (12 Cores)", "ram": "32 GB DDR3 ECC", "storage": "4x 300GB SAS 10K RAID 5", "os": "Red Hat Enterprise Linux 6.5"}'::jsonb,
    'root',
    'Payroll!Adm2026',
    'ระบบประมวลผลเงินเดือนของลูกจ้าง และพนักงานราชการ กง.กห.',
    'online',
    'ประมวลผลเงินเดือนลูกจ้างประจำและพนักงานราชการรายเดือน กรมการเงินกลาโหม',
    true
  ),
  (
    'srv-dfd-ntp-pay',
    'DFD-SRV-NTP-PAY',
    'internal',
    'rack-2',
    'Rack 2 (Storage & Virtualization)',
    13,
    2,
    '192.168.10.33',
    '192.168.10.233',
    '{"brand_model": "Lenovo System x3650 M5 (7440.014.0001.0003.7)", "cpu": "2x Intel Xeon E5-2620 v3 (12 Cores)", "ram": "64 GB DDR4 ECC", "storage": "6x 600GB SAS 12G RAID 6", "os": "Windows Server 2012"}'::jsonb,
    'administrator',
    'NtpServer!2026',
    'ระบบเงินเดือน นถปภ.รอ. (กบช.ทม.รอ.)',
    'online',
    'ระบบฐานข้อมูลและประมวลผลเงินเดือน นถปภ.รอ. (จัดซื้อโดย กง.กห.)',
    true
  ),
  (
    'srv-dfd-budget-p7',
    'DFD-SRV-BUDGET-P7',
    'internal',
    'rack-2',
    'Rack 2 (Storage & Virtualization)',
    9,
    4,
    '192.168.10.34',
    '192.168.10.234',
    '{"brand_model": "IBM Power7 730 (7440.001.0001.0008.7)", "cpu": "2x IBM POWER7 8-Core 3.55 GHz (16 Cores)", "ram": "128 GB DDR3 ECC Reg", "storage": "6x 300GB SFF SAS + Fibre Channel", "os": "IBM AIX 7.1 / DB2 Enterprise"}'::jsonb,
    'root',
    'Power7!Aix2026',
    'ระบบงานควบคุมการเบิกจ่ายงบประมาณ และระบบงานเบี้ยหวัด บำเหน็จ บำนาญ',
    'online',
    'ระบบหลักควบคุมเบิกจ่ายเงินงบประมาณ และฐานข้อมูลบำเหน็จบำนาญ กง.กห.',
    true
  ),
  (
    'srv-dfd-acc-p5',
    'DFD-SRV-ACC-P5',
    'internal',
    'rack-2',
    'Rack 2 (Storage & Virtualization)',
    5,
    4,
    '192.168.10.35',
    '192.168.10.235',
    '{"brand_model": "IBM Power5 p520 (7440.001.0018.025)", "cpu": "2x IBM POWER5+ 1.9 GHz (4 Cores)", "ram": "32 GB DDR2 ECC", "storage": "4x 146GB SCSI U320", "os": "IBM AIX 5.3 / Informix DB"}'::jsonb,
    'root',
    'Power5!Legacy2026',
    'ระบบงานบัญชีเงินราชการของ กง.กห.',
    'online',
    'ระบบงานบัญชีเงินราชการ กรมการเงินกลาโหม (จัดซื้อโดย ทสอ.ฯ)',
    true
  ),
  (
    'srv-dfd-asset-emc',
    'DFD-SRV-ASSET-EMC',
    'internal',
    'rack-2',
    'Rack 2 (Storage & Virtualization)',
    22,
    2,
    '192.168.10.36',
    '192.168.10.236',
    '{"brand_model": "DELL EMC พร้อมชุดปฏิบัติการ (7440.001.0001.0009.7)", "cpu": "2x Intel Xeon Silver 4114", "ram": "64 GB DDR4 ECC", "storage": "12x 1.2TB SAS 10K RAID 6", "os": "Windows Server 2016 Datacenter / MS SQL"}'::jsonb,
    'administrator',
    'DellEmc!Dfd2026',
    'ระบบบริหารจัดการครุภัณฑ์ กง.กห. และทะเบียนคุมสวัสดิการค่าการศึกษาบุตร',
    'online',
    'ระบบฐานข้อมูลทะเบียนคุมครุภัณฑ์ กง.กห. และระบบสวัสดิการค่าเล่าเรียนบุตร',
    true
  ),
  (
    'srv-dfd-fileshare-x32',
    'DFD-SRV-FILESHARE-X32',
    'internal',
    'rack-2',
    'Rack 2 (Storage & Virtualization)',
    20,
    2,
    '192.168.10.37',
    '192.168.10.237',
    '{"brand_model": "IBM SYSTEM x3200-M3 (7440.001.0001.0005.7)", "cpu": "Intel Xeon X3440 (4 Cores)", "ram": "16 GB DDR3 ECC", "storage": "4x 1TB SATA Enterprise RAID 10", "os": "Windows Server 2012 R2 Standard"}'::jsonb,
    'administrator',
    'FileShare!Zdrive2026',
    'ระบบจัดการข้อมูลไฟล์งานทุกอย่าง ไดรฟ์ Z, Y กง.กห.',
    'online',
    'File Server แชร์ข้อมูลงาน ไดรฟ์ Z และไดรฟ์ Y ห้องคอมพิวเตอร์แม่ข่าย กง.กห.',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  environment = EXCLUDED.environment,
  rack_id = EXCLUDED.rack_id,
  rack_name = EXCLUDED.rack_name,
  unit_position = EXCLUDED.unit_position,
  unit_size = EXCLUDED.unit_size,
  ip_address = EXCLUDED.ip_address,
  ilo_ip = EXCLUDED.ilo_ip,
  specs = EXCLUDED.specs,
  role_purpose = EXCLUDED.role_purpose,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------------------
-- 2. นำเข้าโน้ตบุ๊ก 19 เครื่อง ลงตาราง assets
-- --------------------------------------------------------------------
INSERT INTO public.assets (id, asset_code, name, category, status)
VALUES
  -- 11 เครื่องประจำแผนกสนับสนุนทางเทคนิค (สถานะ available พร้อมให้บริการยืม-คืน)
  ('asset-nb-0034', '7440.001.0003.0034', 'Asus ROG Strix G614J (Core i7/16GB/1TB)', 'Laptop', 'available'),
  ('asset-nb-0033', '7440.001.0003.0033', 'Asus ROG Strix G614J (Core i7/16GB/1TB)', 'Laptop', 'available'),
  ('asset-nb-0027', '7440.001.0003.0027.7', 'ASUS Vivobook 15 X1502Z', 'Laptop', 'available'),
  ('asset-nb-0028', '7440.001.0003.0028.7', 'ASUS Vivobook 15 X1502Z', 'Laptop', 'available'),
  ('asset-nb-0029', '7440.001.0003.0029.7', 'ASUS Vivobook 15 X1502Z', 'Laptop', 'available'),
  ('asset-nb-0030', '7440.001.0003.0030.7', 'ASUS Vivobook 15 X1502Z', 'Laptop', 'available'),
  ('asset-nb-0031', '7440.001.0003.0031.7', 'ASUS Vivobook 15 X1502Z', 'Laptop', 'available'),
  ('asset-nb-0032', '7440.001.0003.0032.7', 'ASUS Vivobook 15 X1502Z', 'Laptop', 'available'),
  ('asset-nb-0037', '7440.001.0003.0037', 'Dell Pro 15 Essential 3520', 'Laptop', 'available'),
  ('asset-nb-0038', '7440.001.0003.0038', 'Dell Pro 15 Essential 3520', 'Laptop', 'available'),
  ('asset-nb-0039', '7440.001.0003.0039', 'Dell Pro 15 Essential 3520', 'Laptop', 'available'),

  -- 8 เครื่องประจำตำแหน่ง/แผนกอื่น (สถานะ borrowed มีผู้ถือครองแล้ว)
  ('asset-nb-0012', '7440.001.0003.0012.7', 'Lenovo ThinkPad L430 (ผอ.กกมง.กง.กห.)', 'Laptop', 'borrowed'),
  ('asset-nb-0021', '7440.001.0003.0021.7', 'Acer Aspire E5-471-32GS (จก.กง.กห.)', 'Laptop', 'borrowed'),
  ('asset-nb-0001', '7440.001.0003.0001', 'DELL Vostro 14 3000 series', 'Laptop', 'borrowed'),
  ('asset-nb-0002', '7440.001.0003.0002', 'DELL Vostro 14 3000 series (กบช.ทม.รอ.)', 'Laptop', 'borrowed'),
  ('asset-nb-0025', '7440.001.0003.0025', 'DELL Latitude 3400', 'Laptop', 'borrowed'),
  ('asset-nb-0026', '7440.001.0003.0026', 'DELL Latitude 3400', 'Laptop', 'borrowed'),
  ('asset-nb-0035', '7440.001.0003.0035', 'Dell Pro 15 Essential (หน.กำลังพล กลาง.กง.กห.)', 'Laptop', 'borrowed'),
  ('asset-nb-0036', '7440.001.0003.0036', 'Dell Pro 15 Essential (หน.แผน กจก.กง.กห.)', 'Laptop', 'borrowed')
ON CONFLICT (id) DO UPDATE SET
  asset_code = EXCLUDED.asset_code,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  status = EXCLUDED.status;

-- --------------------------------------------------------------------
-- 3. นำเข้าข้อมูลการถือครองโน้ตบุ๊ก 8 เครื่อง ลงตาราง borrow_logs
-- --------------------------------------------------------------------
INSERT INTO public.borrow_logs (
  id, asset_id, asset_code, asset_name, borrower_name, borrower_division_name,
  borrower_dept_name, borrow_date, expected_return_date, staff_name, condition_out, notes
) VALUES
  (
    'loan-dfd-nb-0012',
    'asset-nb-0012',
    '7440.001.0003.0012.7',
    'Lenovo ThinkPad L430 (ผอ.กกมง.กง.กห.)',
    'ผอ.กกมง.กง.กห.',
    'กกมง. ฯ',
    'ผอ.กกมง.กง.กห.',
    '2026-01-15T08:30:00.000Z',
    '2026-12-31T16:30:00.000Z',
    'แผนกสนับสนุนทางเทคนิค',
    'ปกติ พร้อมใช้งาน',
    'เครื่องประจำตำแหน่ง ผอ.กกมง.กง.กห. (ทสอ.ฯ)'
  ),
  (
    'loan-dfd-nb-0021',
    'asset-nb-0021',
    '7440.001.0003.0021.7',
    'Acer Aspire E5-471-32GS (จก.กง.กห.)',
    'จก.กง.กห.',
    'สำนักงานผู้บังคับบัญชา',
    'จก.กง.กห.',
    '2026-01-15T08:30:00.000Z',
    '2026-12-31T16:30:00.000Z',
    'แผนกสนับสนุนทางเทคนิค',
    'ปกติ พร้อมใช้งาน',
    'เครื่องประจำสำนักงาน จก.กง.กห.'
  ),
  (
    'loan-dfd-nb-0001',
    'asset-nb-0001',
    '7440.001.0003.0001',
    'DELL Vostro 14 3000 series',
    'เจ้าหน้าที่แผนกสารสนเทศพิเศษ',
    'กกมง. ฯ',
    'แผนกสารสนเทศพิเศษ กกมง.กง.กห.',
    '2026-01-15T08:30:00.000Z',
    '2026-12-31T16:30:00.000Z',
    'แผนกสนับสนุนทางเทคนิค',
    'ปกติ พร้อมใช้งาน',
    'ใช้งานประจำแผนกสารสนเทศพิเศษ'
  ),
  (
    'loan-dfd-nb-0002',
    'asset-nb-0002',
    '7440.001.0003.0002',
    'DELL Vostro 14 3000 series (กบช.ทม.รอ.)',
    'เจ้าหน้าที่ กบช.ทม.รอ.',
    'นถปภ.รอ.',
    'กบช.ทม.รอ.',
    '2026-01-15T08:30:00.000Z',
    '2026-12-31T16:30:00.000Z',
    'แผนกสนับสนุนทางเทคนิค',
    'ปกติ พร้อมใช้งาน',
    'โครงการ นถปภ.รอ.'
  ),
  (
    'loan-dfd-nb-0025',
    'asset-nb-0025',
    '7440.001.0003.0025',
    'DELL Latitude 3400',
    'เจ้าหน้าที่แผนกสารสนเทศพิเศษ',
    'กกมง. ฯ',
    'แผนกสารสนเทศพิเศษ กกมง.กง.กห.',
    '2026-01-15T08:30:00.000Z',
    '2026-12-31T16:30:00.000Z',
    'แผนกสนับสนุนทางเทคนิค',
    'ปกติ พร้อมใช้งาน',
    'ใช้งานประจำแผนกสารสนเทศพิเศษ'
  ),
  (
    'loan-dfd-nb-0026',
    'asset-nb-0026',
    '7440.001.0003.0026',
    'DELL Latitude 3400',
    'เจ้าหน้าที่แผนกสารสนเทศพิเศษ',
    'กกมง. ฯ',
    'แผนกสารสนเทศพิเศษ กกมง.กง.กห.',
    '2026-01-15T08:30:00.000Z',
    '2026-12-31T16:30:00.000Z',
    'แผนกสนับสนุนทางเทคนิค',
    'ปกติ พร้อมใช้งาน',
    'ใช้งานประจำแผนกสารสนเทศพิเศษ'
  ),
  (
    'loan-dfd-nb-0035',
    'asset-nb-0035',
    '7440.001.0003.0035',
    'Dell Pro 15 Essential (หน.กำลังพล กลาง.กง.กห.)',
    'หน.กำลังพล กลาง.กง.กห.',
    'กลาง. ฯ',
    'หน.กำลังพล กลาง.กง.กห.',
    '2026-01-15T08:30:00.000Z',
    '2026-12-31T16:30:00.000Z',
    'แผนกสนับสนุนทางเทคนิค',
    'ปกติ พร้อมใช้งาน',
    'เครื่องประจำแผนกกำลังพล กลาง.กง.กห.'
  ),
  (
    'loan-dfd-nb-0036',
    'asset-nb-0036',
    '7440.001.0003.0036',
    'Dell Pro 15 Essential (หน.แผน กจก.กง.กห.)',
    'หน.แผน กจก.กง.กห.',
    'กจก. ฯ',
    'หน.แผน กจก.กง.กห.',
    '2026-01-15T08:30:00.000Z',
    '2026-12-31T16:30:00.000Z',
    'แผนกสนับสนุนทางเทคนิค',
    'ปกติ พร้อมใช้งาน',
    'เครื่องประจำแผนกแผน กจก.กง.กห.'
  )
ON CONFLICT (id) DO UPDATE SET
  asset_code = EXCLUDED.asset_code,
  asset_name = EXCLUDED.asset_name,
  borrower_name = EXCLUDED.borrower_name,
  borrower_division_name = EXCLUDED.borrower_division_name,
  borrower_dept_name = EXCLUDED.borrower_dept_name,
  borrow_date = EXCLUDED.borrow_date,
  expected_return_date = EXCLUDED.expected_return_date,
  staff_name = EXCLUDED.staff_name,
  condition_out = EXCLUDED.condition_out,
  notes = EXCLUDED.notes;
