import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  parseBakBuffer,
  parseExcelFiles,
  generateBakCsvReport,
  calculateEquipmentAge,
} from '../src/lib/services/bak-parser-service';

describe('BakParserService: Microsoft SQL Server .bak & Multi-Excel Equipment Extraction', () => {
  const sampleBakPath = '/Users/superman/Desktop/DFDEquipment-20261109.bak';
  const sampleExcelFiles = [
    '/Users/superman/Downloads/INKJET.xls',
    '/Users/superman/Downloads/เครื่องพิมพ์ Ink Tank Printer.xls',
    '/Users/superman/Downloads/เครื่องพิมพ์ LINE PRINTER.xls',
    '/Users/superman/Downloads/เครื่องพิมพ์แบบดอทเมตริก.xls',
    '/Users/superman/Downloads/คอมพิวเตอร์ ๑.xls',
    '/Users/superman/Downloads/เครื่องพิมพ์เลเซอร์ ธ่ค 57.xls',
  ];

  it('calculates equipment age and age brackets correctly based on fiscal year', () => {
    // Current year is 2569
    const ageNew = calculateEquipmentAge('2568', 2569);
    expect(ageNew.ageYears).toBe(1);
    expect(ageNew.ageBracket).toBe('1-7');
    expect(ageNew.ageStatusLabel).toBe('ใช้งานปกติ');

    const ageMid = calculateEquipmentAge('2560', 2569);
    expect(ageMid.ageYears).toBe(9);
    expect(ageMid.ageBracket).toBe('7-14');
    expect(ageMid.ageStatusLabel).toBe('เริ่มเสื่อมสภาพ');

    const ageOld = calculateEquipmentAge('2550', 2569);
    expect(ageOld.ageYears).toBe(19);
    expect(ageOld.ageBracket).toBe('14+');
    expect(ageOld.ageStatusLabel).toBe('เกินเกณฑ์/รอจำหน่าย');

    const ageUnknown = calculateEquipmentAge('ไม่ระบุปี', 2569);
    expect(ageUnknown.ageBracket).toBe('unknown');
  });

  it('correctly parses the .bak file, extracts equipment records, and computes age brackets', () => {
    if (!fs.existsSync(sampleBakPath)) {
      console.warn('Sample .bak file not found on desktop, skipping live file test');
      return;
    }

    const buffer = fs.readFileSync(sampleBakPath);
    const result = parseBakBuffer(buffer, 'DFDEquipment-20261109.bak', 2569);

    expect(result).toBeDefined();
    expect(result.fileName).toBe('DFDEquipment-20261109.bak');
    expect(result.sourceType).toBe('bak');
    expect(result.items.length).toBe(402);

    // Summary checks
    expect(result.summary.totalCount).toBe(402);
    expect(result.summary.totalValue).toBeGreaterThan(0);
    expect(result.summary.age1To7Count).toBeGreaterThan(0);
    expect(result.summary.age7To14Count).toBeGreaterThan(0);
    expect(result.summary.age14PlusCount).toBeGreaterThan(0);

    // Age breakdown check
    expect(result.byAge).toBeDefined();
    expect(result.byAge.length).toBe(4); // 1-7, 7-14, 14+, unknown

    // Cross-tab age matrix check
    expect(result.crossTabAge).toBeDefined();
    expect(result.crossTabAge.length).toBeGreaterThan(0);
    const pcRow = result.crossTabAge.find((r) => r.type.includes('คอมพิวเตอร์ (PC'));
    expect(pcRow).toBeDefined();
    expect(pcRow?.total).toBeGreaterThan(100);

    // Check individual items have age fields
    const sampleItem = result.items[0];
    expect(sampleItem.ageYears).toBeGreaterThanOrEqual(0);
    expect(sampleItem.ageBracket).toBeTruthy();
    expect(sampleItem.ageStatusLabel).toBeTruthy();
  });

  it('correctly parses multiple Excel .xls files and merges them with age brackets', () => {
    const existingFiles = sampleExcelFiles.filter((p) => fs.existsSync(p));
    if (existingFiles.length === 0) {
      console.warn('Sample Excel files not found in Downloads, skipping');
      return;
    }

    const filePayloads = existingFiles.map((p) => ({
      name: path.basename(p),
      buffer: fs.readFileSync(p),
    }));

    const result = parseExcelFiles(filePayloads, 2569);

    expect(result).toBeDefined();
    expect(result.sourceType).toBe('excel');
    expect(result.items.length).toBeGreaterThan(200);
    expect(result.availableFiles).toBeDefined();
    expect(result.availableFiles?.length).toBe(existingFiles.length);

    // Summary checks
    expect(result.summary.totalCount).toBe(result.items.length);
    expect(result.summary.age1To7Count).toBeGreaterThan(50);
    expect(result.summary.age7To14Count).toBeGreaterThan(50);
    expect(result.summary.age14PlusCount).toBeGreaterThan(5);

    // Age breakdown checks
    expect(result.byAge.length).toBe(4);
    const age14Plus = result.byAge.find((a) => a.bracket === '14+');
    expect(age14Plus).toBeDefined();
    expect(age14Plus?.count).toBeGreaterThan(5);

    // Item checks
    const itemWithSource = result.items.find((i) => i.sourceFile?.includes('คอมพิวเตอร์'));
    expect(itemWithSource).toBeDefined();
    expect(itemWithSource?.sourceFile).toBeTruthy();
    expect(itemWithSource?.ageBracket).toBeTruthy();
  });

  it('generates a valid CSV with UTF-8 BOM containing age and source file columns', () => {
    if (!fs.existsSync(sampleBakPath)) return;

    const buffer = fs.readFileSync(sampleBakPath);
    const result = parseBakBuffer(buffer, 'DFDEquipment-20261109.bak', 2569);
    const csv = generateBakCsvReport(result.items);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('รหัสครุภัณฑ์');
    expect(csv).toContain('ชื่อครุภัณฑ์');
    expect(csv).toContain('อายุใช้งาน (ปี)');
    expect(csv).toContain('สถานะอายุ');
    expect(csv).toContain('ไฟล์ต้นทาง');
  });
});

