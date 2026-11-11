import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseBakBuffer, parseExcelFiles } from '@/lib/services/bak-parser-service';
import sampleBakData from '@/lib/data/sample-bak-data.json';
import { BakParseResult } from '@/types/bak-equipment';

const SAMPLE_EXCEL_PATHS = [
  '/Users/superman/Downloads/คอมพิวเตอร์ ๑.xls',
  '/Users/superman/Downloads/เครื่องพิมพ์เลเซอร์ ธ่ค 57.xls',
  '/Users/superman/Downloads/INKJET.xls',
  '/Users/superman/Downloads/เครื่องพิมพ์ Ink Tank Printer.xls',
  '/Users/superman/Downloads/เครื่องพิมพ์ LINE PRINTER.xls',
  '/Users/superman/Downloads/เครื่องพิมพ์แบบดอทเมตริก.xls',
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sampleParam = searchParams.get('sample');
  const fiscalYearParam = parseInt(searchParams.get('year') || '2569', 10);
  const currentYear = isNaN(fiscalYearParam) ? 2569 : fiscalYearParam;

  if (sampleParam === 'compare' || sampleParam === 'both') {
    try {
      // 1. Load BAK
      let bakResult: BakParseResult = sampleBakData as unknown as BakParseResult;
      const desktopPath = '/Users/superman/Desktop/DFDEquipment-20261109.bak';
      if (fs.existsSync(/*turbopackIgnore: true*/ desktopPath)) {
        try {
          const buffer = fs.readFileSync(/*turbopackIgnore: true*/ desktopPath);
          bakResult = parseBakBuffer(buffer, 'DFDEquipment-20261109.bak', currentYear);
        } catch (err: unknown) {
          console.warn('Failed to parse desktop .bak in compare, using sample data:', err);
        }
      }

      // 2. Load Excel
      let excelResult: BakParseResult | null = null;
      const existingFiles = SAMPLE_EXCEL_PATHS.filter((p) =>
        fs.existsSync(/*turbopackIgnore: true*/ p)
      );
      if (existingFiles.length > 0) {
        const filePayloads = existingFiles.map((p) => ({
          name: path.basename(p),
          buffer: fs.readFileSync(/*turbopackIgnore: true*/ p),
        }));
        excelResult = parseExcelFiles(filePayloads, currentYear);
      }

      return NextResponse.json({
        success: true,
        data: {
          bak: bakResult,
          excel: excelResult,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { success: false, error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลตัวอย่างทั้งสองแหล่ง: ' + message },
        { status: 500 }
      );
    }
  }

  if (sampleParam === 'excel') {
    try {
      const existingFiles = SAMPLE_EXCEL_PATHS.filter((p) =>
        fs.existsSync(/*turbopackIgnore: true*/ p)
      );
      if (existingFiles.length > 0) {
        const filePayloads = existingFiles.map((p) => ({
          name: path.basename(p),
          buffer: fs.readFileSync(/*turbopackIgnore: true*/ p),
        }));
        const result = parseExcelFiles(filePayloads, currentYear);
        return NextResponse.json({ success: true, data: result });
      }
    } catch (err: unknown) {
      console.warn('Failed to load sample Excel files:', err);
    }

    return NextResponse.json(
      { success: false, error: 'ไม่พบไฟล์ Excel ตัวอย่างในระบบ' },
      { status: 404 }
    );
  }

  if (sampleParam === 'true' || sampleParam === 'bak') {
    const desktopPath = '/Users/superman/Desktop/DFDEquipment-20261109.bak';
    if (fs.existsSync(/*turbopackIgnore: true*/ desktopPath)) {
      try {
        const buffer = fs.readFileSync(/*turbopackIgnore: true*/ desktopPath);
        const result = parseBakBuffer(buffer, 'DFDEquipment-20261109.bak', currentYear);
        return NextResponse.json({ success: true, data: result });
      } catch (err: unknown) {
        console.warn('Failed to parse desktop .bak, falling back to cached sample JSON:', err);
      }
    }

    return NextResponse.json({ success: true, data: sampleBakData });
  }

  return NextResponse.json({
    success: true,
    message: 'BAK & Excel Parser API Ready. Send a POST request with .bak or .xls/.xlsx files.',
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fiscalYearParam = parseInt((formData.get('year') as string) || '2569', 10);
    const currentYear = isNaN(fiscalYearParam) ? 2569 : fiscalYearParam;

    // Support both multiple files ('files') and single file ('file')
    const filesList = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File | null;

    const allFiles = filesList.length > 0 ? filesList : singleFile ? [singleFile] : [];

    if (allFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบไฟล์ กรุณาเลือกไฟล์ .bak หรือไฟล์ Excel (.xls, .xlsx)' },
        { status: 400 }
      );
    }

    // Check if uploaded files are Excel
    const excelFiles = allFiles.filter((f) => {
      const lower = f.name.toLowerCase();
      return lower.endsWith('.xls') || lower.endsWith('.xlsx');
    });

    if (excelFiles.length > 0) {
      const filePayloads = await Promise.all(
        excelFiles.map(async (f) => ({
          name: f.name,
          buffer: Buffer.from(await f.arrayBuffer()),
        }))
      );

      const result = parseExcelFiles(filePayloads, currentYear);

      if (result.items.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'ไม่พบแถวข้อมูลครุภัณฑ์ที่ถูกต้องในไฟล์ Excel ที่อัปโหลด กรุณาตรวจสอบหัวตารางและเนื้อหา',
          },
          { status: 422 }
        );
      }

      return NextResponse.json({ success: true, data: result });
    }

    // Otherwise check for .bak file
    const bakFile = allFiles.find((f) => f.name.toLowerCase().endsWith('.bak'));
    if (!bakFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'รูปแบบไฟล์ไม่ถูกต้อง รองรับเฉพาะไฟล์นามสกุล .bak และ .xls / .xlsx เท่านั้น',
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await bakFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 8192) {
      return NextResponse.json(
        { success: false, error: 'ขนาดไฟล์เล็กเกินไป ไม่ใช่ไฟล์ฐานข้อมูลสำรอง SQL Server ที่ถูกต้อง' },
        { status: 400 }
      );
    }

    const result = parseBakBuffer(buffer, bakFile.name, currentYear);

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
  } catch (error: unknown) {
    console.error('Error in POST /api/bak-parser:', error);
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการประมวลผลไฟล์';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
