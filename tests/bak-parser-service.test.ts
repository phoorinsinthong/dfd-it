import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  parseBakBuffer,
  parseExcelFiles,
  generateBakCsvReport,
  calculateEquipmentAge,
  isWarehouse12,
  filterReportItems,
  countWarehouse12Excluded,
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

    // Update cached sample json with latest structure including age brackets
    fs.writeFileSync(
      path.resolve(__dirname, '../src/lib/data/sample-bak-data.json'),
      JSON.stringify(result, null, 2),
      'utf-8'
    );

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

    // Update cached sample json with latest structure including age brackets
    fs.writeFileSync(
      path.resolve(__dirname, '../src/lib/data/sample-bak-data.json'),
      JSON.stringify(result, null, 2),
      'utf-8'
    );
    const csv = generateBakCsvReport(result.items);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('รหัสครุภัณฑ์');
    expect(csv).toContain('ชื่อครุภัณฑ์');
    expect(csv).toContain('อายุใช้งาน (ปี)');
    expect(csv).toContain('สถานะอายุ');
    expect(csv).toContain('ไฟล์ต้นทาง');
  });

  it('correctly detects "คลัง 12" and excludes it when filtering reports for Excel sources', () => {
    // 1. isWarehouse12 unit check
    expect(isWarehouse12('คลัง 12')).toBe(true);
    expect(isWarehouse12('คลัง12')).toBe(true);
    expect(isWarehouse12('คลัง  12')).toBe(true);
    expect(isWarehouse12('ประจำแผนก คลัง 12')).toBe(true);
    expect(isWarehouse12('คลัง 1')).toBe(false);
    expect(isWarehouse12('คลังพัสดุ')).toBe(false);
    expect(isWarehouse12('กองการเงิน')).toBe(false);
    expect(isWarehouse12(null)).toBe(false);
    expect(isWarehouse12(undefined)).toBe(false);

    // 2. filterReportItems exclusion check
    const mockItems = [
      {
        id: 1,
        code: '7440.001.0001',
        name: 'PC Alpha',
        type: 'คอมพิวเตอร์ (PC/All-in-One)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
        year: '2550',
        ageYears: 19,
        ageBracket: '14+' as const,
        ageStatusLabel: 'เกินเกณฑ์/รอจำหน่าย',
        deptName: 'คลัง 12',
        sourceType: 'excel' as const,
        sourceFile: 'คอมพิวเตอร์ ๑.xls',
        price: 25000,
        serial: 'SN001',
        docNo: '1/50',
        remark: '',
        unit: 'เครื่อง',
        statusId: 1,
        deptId: 0,
      },
      {
        id: 2,
        code: '7440.001.0002',
        name: 'PC Beta',
        type: 'คอมพิวเตอร์ (PC/All-in-One)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
        year: '2560',
        ageYears: 9,
        ageBracket: '7-14' as const,
        ageStatusLabel: 'เริ่มเสื่อมสภาพ',
        deptName: 'แผนกสนับสนุนเทคนิค',
        sourceType: 'excel' as const,
        sourceFile: 'คอมพิวเตอร์ ๑.xls',
        price: 20000,
        serial: 'SN002',
        docNo: '2/60',
        remark: '',
        unit: 'เครื่อง',
        statusId: 1,
        deptId: 0,
      },
      {
        id: 3,
        code: '7440.001.0003',
        name: 'PC Gamma',
        type: 'คอมพิวเตอร์ (PC/All-in-One)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
        year: '2552',
        ageYears: 17,
        ageBracket: '14+' as const,
        ageStatusLabel: 'เกินเกณฑ์/รอจำหน่าย',
        deptName: 'คลัง 12',
        sourceType: 'bak' as const,
        sourceFile: 'DFDEquipment-20261109.bak',
        price: 30000,
        serial: 'SN003',
        docNo: '3/52',
        remark: '',
        unit: 'เครื่อง',
        statusId: 1,
        deptId: 0,
      },
    ];

    // For Excel items: item 1 (คลัง 12) must be excluded, item 2 must remain
    const filteredExcel = filterReportItems(mockItems.slice(0, 2), { isExcelSource: true });
    expect(filteredExcel.length).toBe(1);
    expect(filteredExcel[0].code).toBe('7440.001.0002');
    expect(filteredExcel[0].deptName).toBe('แผนกสนับสนุนเทคนิค');

    // For BAK items: item 3 (คลัง 12) should NOT be excluded because sourceType is bak
    const filteredBak = filterReportItems([mockItems[2]], { isExcelSource: false });
    expect(filteredBak.length).toBe(1);
    expect(filteredBak[0].code).toBe('7440.001.0003');

    // Check oldest-first sorting: oldest age (17 years) should precede 9 years
    const mixedList = filterReportItems([mockItems[1], mockItems[2]], { isExcelSource: false });
    expect(mixedList[0].ageYears).toBe(17);
    expect(mixedList[1].ageYears).toBe(9);

    // 3. countWarehouse12Excluded check with scope filters
    const whCountAll = countWarehouse12Excluded(mockItems.slice(0, 2), { isExcelSource: true });
    expect(whCountAll).toBe(1);

    const whCountWithDiffCat = countWarehouse12Excluded(mockItems.slice(0, 2), {
      isExcelSource: true,
      category: 'ครุภัณฑ์สำนักงาน',
    });
    expect(whCountWithDiffCat).toBe(0);

    const whCountBak = countWarehouse12Excluded([mockItems[2]], { isExcelSource: false });
    expect(whCountBak).toBe(0);
  });
});

