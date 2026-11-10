import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseBakBuffer } from '@/lib/services/bak-parser-service';
import sampleBakData from '@/lib/data/sample-bak-data.json';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isSample = searchParams.get('sample') === 'true';

  if (isSample) {
    const desktopPath = '/Users/superman/Desktop/DFDEquipment-20261109.bak';
    if (fs.existsSync(desktopPath)) {
      try {
        const buffer = fs.readFileSync(desktopPath);
        const result = parseBakBuffer(buffer, 'DFDEquipment-20261109.bak');
        return NextResponse.json({ success: true, data: result });
      } catch (err: any) {
        console.warn('Failed to parse desktop .bak, falling back to cached sample JSON:', err);
      }
    }

    return NextResponse.json({ success: true, data: sampleBakData });
  }

  return NextResponse.json({
    success: true,
    message: 'BAK Parser API Ready. Send a POST request with multipart/form-data containing .bak file.',
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบไฟล์ .bak กรุณาเลือกไฟล์ที่ต้องการอัปโหลด' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.bak')) {
      return NextResponse.json(
        { success: false, error: 'รูปแบบไฟล์ไม่ถูกต้อง กรุณาอัปโหลดไฟล์นามสกุล .bak เท่านั้น' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 8192) {
      return NextResponse.json(
        { success: false, error: 'ขนาดไฟล์เล็กเกินไป ไม่ใช่ไฟล์ฐานข้อมูลสำรอง SQL Server ที่ถูกต้อง' },
        { status: 400 }
      );
    }

    const result = parseBakBuffer(buffer, file.name);

    if (result.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'ไม่พบข้อมูลครุภัณฑ์ในไฟล์ .bak นี้ หรือโครงสร้างตารางไม่ตรงกับมาตรฐาน DFDEquipment',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error in POST /api/bak-parser:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการประมวลผลไฟล์ .bak' },
      { status: 500 }
    );
  }
}
