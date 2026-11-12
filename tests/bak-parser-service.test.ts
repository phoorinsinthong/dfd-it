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
  normalizeEquipmentCode,
  reconcileEquipmentData,
  generateReconciliationCsv,
} from '../src/lib/services/bak-parser-service';
import { BakEquipmentItem } from '../src/types/bak-equipment';

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
    expect(result.items.length).toBe(791);

    // Status and Procurement extraction checks
    expect(result.items.some((i) => i.statusId === 1 && i.statusName === 'ใช้งานปกติ')).toBe(true);
    expect(result.items.some((i) => i.statusId === 2 && i.statusName === 'ส่งซ่อม')).toBe(true);
    expect(result.items.some((i) => i.statusId === 3 && i.statusName === 'ส่งคืน')).toBe(true);
    expect(result.items.some((i) => i.procurementName === 'กง.กห.')).toBe(true);
    expect(result.items.some((i) => i.procurementName === 'ทสอ.ฯ')).toBe(true);

    // Specific record checks from legacy report
    const item0491 = result.items.find((i) => i.code === '7440.001.0001.0491');
    expect(item0491).toBeDefined();
    expect(item0491?.procurementName).toBe('ทสอ.ฯ');
    expect(item0491?.statusName).toBe('ส่งคืน');
    expect(item0491?.division).toBe('ส่งคืน กลาง.กง.กห. รอจำหน่าย');
    expect(item0491?.deptName).toBe('รอง จก.กง.กห. (1)');
    expect(item0491?.osName).toBe('Windows 10');
    expect(item0491?.year).toBe('2553');
    expect(item0491?.remark).toContain('ส่งคืนเมื่อ 31 มี.ค.68');

    const item0492 = result.items.find((i) => i.code === '7440.001.0001.0492');
    expect(item0492).toBeDefined();
    expect(item0492?.procurementName).toBe('ทสอ.ฯ');
    expect(item0492?.statusName).toBe('ใช้งานปกติ');
    expect(item0492?.division).toBe('กบน. ฯ');
    expect(item0492?.projectName).toBe('เบี้ยหวัด/บำเหน็จบำนาญ');
    expect(item0492?.osName).toBe('Windows 10');

    // Summary checks
    expect(result.summary.totalCount).toBe(791);
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

  it('filters .bak report exclusively for items with status "ใช้งานปกติ" and procurement "กง.กห."', () => {
    // 1. Mock items test
    const mockBakItems = [
      {
        id: 1,
        code: '7440.001.0001',
        name: 'คอมพิวเตอร์ A (กง.กห. ใช้งานปกติ)',
        type: 'คอมพิวเตอร์ (PC / All-in-one)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
        year: '2560',
        ageYears: 9,
        ageBracket: '7-14' as const,
        ageStatusLabel: 'เริ่มเสื่อมสภาพ',
        deptName: 'การเงิน กง.กห.',
        statusId: 1,
        statusName: 'ใช้งานปกติ',
        procurementId: 2,
        procurementName: 'กง.กห.',
        sourceType: 'bak' as const,
        price: 20000,
        serial: 'SN01',
        docNo: '1/60',
        remark: '',
        unit: 'เครื่อง',
        deptId: 1,
      },
      {
        id: 2,
        code: '7440.001.0002',
        name: 'คอมพิวเตอร์ B (กง.กห. ส่งซ่อม)',
        type: 'คอมพิวเตอร์ (PC / All-in-one)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
        year: '2560',
        ageYears: 9,
        ageBracket: '7-14' as const,
        ageStatusLabel: 'เริ่มเสื่อมสภาพ',
        deptName: 'การเงิน กง.กห.',
        statusId: 2,
        statusName: 'ส่งซ่อม',
        procurementId: 2,
        procurementName: 'กง.กห.',
        sourceType: 'bak' as const,
        price: 20000,
        serial: 'SN02',
        docNo: '2/60',
        remark: '',
        unit: 'เครื่อง',
        deptId: 1,
      },
      {
        id: 3,
        code: '7440.001.0003',
        name: 'คอมพิวเตอร์ C (ทสอ. ใช้งานปกติ แต่หน่วยงาน กง.กห.)',
        type: 'คอมพิวเตอร์ (PC / All-in-one)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
        year: '2562',
        ageYears: 7,
        ageBracket: '1-7' as const,
        ageStatusLabel: 'ใช้งานปกติ',
        deptName: 'สารบรรณ กง.กห.',
        statusId: 1,
        statusName: 'ใช้งานปกติ',
        procurementId: 1,
        procurementName: 'ทสอ.ฯ',
        sourceType: 'bak' as const,
        price: 25000,
        serial: 'SN03',
        docNo: '3/62',
        remark: '',
        unit: 'เครื่อง',
        deptId: 2,
      },
      {
        id: 4,
        code: '7440.001.0004',
        name: 'คอมพิวเตอร์ D (สม. ใช้งานปกติ ไม่ใช่ กง.กห.)',
        type: 'คอมพิวเตอร์ (PC / All-in-one)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
        year: '2563',
        ageYears: 6,
        ageBracket: '1-7' as const,
        ageStatusLabel: 'ใช้งานปกติ',
        deptName: 'ส่งคืน ทสอ.กห.',
        statusId: 1,
        statusName: 'ใช้งานปกติ',
        procurementId: 3,
        procurementName: 'สม.',
        sourceType: 'bak' as const,
        price: 28000,
        serial: 'SN04',
        docNo: '4/63',
        remark: '',
        unit: 'เครื่อง',
        deptId: 3,
      },
    ];

    // Filter with .bak options: status 'ปกติ/ใช้งานปกติ', procurement 'กง.กห.'
    // Strict Procurement Match: ONLY Item 1 matches (strict procurementId = 2)
    const resultStrict = filterReportItems(mockBakItems, {
      isExcelSource: false,
      bakStatusFilter: 'ปกติ',
      bakProcurementFilter: 'กง.กห.',
    });
    expect(resultStrict.length).toBe(1);
    expect(resultStrict[0].code).toBe('7440.001.0001');

    // Filter with status 'ส่งซ่อม' (statusId = 2)
    const resultRepair = filterReportItems(mockBakItems, {
      isExcelSource: false,
      bakStatusFilter: 'ส่งซ่อม',
      bakProcurementFilter: 'all',
    });
    expect(resultRepair.length).toBe(1);
    expect(resultRepair[0].code).toBe('7440.001.0002');

    // Filter with procurement 'ทสอ.' (procurementId = 1)
    const resultThaSorOr = filterReportItems(mockBakItems, {
      isExcelSource: false,
      bakStatusFilter: 'all',
      bakProcurementFilter: 'ทสอ.',
      bakIncludeDeptMatch: false,
    });
    expect(resultThaSorOr.length).toBe(1);
    expect(resultThaSorOr[0].code).toBe('7440.001.0003');

    // Filter with procurement 'สม.' (procurementId = 3)
    const resultSorMor = filterReportItems(mockBakItems, {
      isExcelSource: false,
      bakStatusFilter: 'all',
      bakProcurementFilter: 'สม.',
      bakIncludeDeptMatch: false,
    });
    expect(resultSorMor.length).toBe(1);
    expect(resultSorMor[0].code).toBe('7440.001.0004');

    // 2. Live .bak file testing
    if (fs.existsSync(sampleBakPath)) {
      const buffer = fs.readFileSync(sampleBakPath);
      const parsed = parseBakBuffer(buffer, 'DFDEquipment-20261109.bak', 2569);

      // Filter live .bak with status: ปกติ / ใช้งานปกติ, procurement: กง.กห.
      const liveFiltered = filterReportItems(parsed.items, {
        isExcelSource: false,
        bakStatusFilter: 'ใช้งานปกติ',
        bakProcurementFilter: 'กง.กห.',
      });

      expect(liveFiltered.every((i) => i.statusId === 1 && (i.statusName === 'ปกติ' || i.statusName === 'ใช้งานปกติ'))).toBe(true);
      expect(
        liveFiltered.every(
          (i) => i.procurementName === 'กง.กห.' && i.procurementId === 2
        )
      ).toBe(true);
      expect(liveFiltered.length).toBe(689);

      // Verify computer (PC) filtering with strict procurement (excluding notebooks & servers)
      const liveComputersKongKorHor = filterReportItems(parsed.items, {
        isExcelSource: false,
        type: 'คอมพิวเตอร์ (PC / All-in-one)',
        bakStatusFilter: 'ใช้งานปกติ',
        bakProcurementFilter: 'กง.กห.',
      });
      // Exactly 214 pure desktop PCs purchased by กง.กห. (excluding notebooks & enterprise servers)
      expect(liveComputersKongKorHor.length).toBe(214);
      expect(liveComputersKongKorHor.every((i) => i.procurementName === 'กง.กห.')).toBe(true);

      const liveComputersThaSorOr = filterReportItems(parsed.items, {
        isExcelSource: false,
        type: 'คอมพิวเตอร์ (PC / All-in-one)',
        bakStatusFilter: 'ใช้งานปกติ',
        bakProcurementFilter: 'ทสอ.ฯ',
      });
      // Exactly 16 active desktop PCs purchased by ทสอ.ฯ (e.g. 0492)
      expect(liveComputersThaSorOr.length).toBe(16);
      expect(liveComputersThaSorOr.every((i) => i.procurementName === 'ทสอ.ฯ')).toBe(true);

      // Verify separated servers filtering
      const liveServersKongKorHor = filterReportItems(parsed.items, {
        isExcelSource: false,
        type: 'คอมพิวเตอร์แม่ข่าย (Server)',
        bakStatusFilter: 'ใช้งานปกติ',
        bakProcurementFilter: 'กง.กห.',
      });
      // Exactly 6 active servers purchased by กง.กห. (x3200-M3, x3550-M4, Supermicro, P7-730, Dell EMC, Lenovo x3650)
      expect(liveServersKongKorHor.length).toBe(6);
      expect(liveServersKongKorHor.every((i) => i.procurementName === 'กง.กห.')).toBe(true);
      expect(liveServersKongKorHor.some((i) => i.code === '7440.001.0001.0005.7')).toBe(true); // IBM System x3200-M3
      expect(liveServersKongKorHor.some((i) => i.code === '7440.014.0001.0003.7')).toBe(true); // Lenovo x3650 Server

      const liveServersThaSorOr = filterReportItems(parsed.items, {
        isExcelSource: false,
        type: 'คอมพิวเตอร์แม่ข่าย (Server)',
        bakStatusFilter: 'ใช้งานปกติ',
        bakProcurementFilter: 'ทสอ.ฯ',
      });
      // Exactly 1 active server purchased by ทสอ.ฯ (IBM P5-P520)
      expect(liveServersThaSorOr.length).toBe(1);
      expect(liveServersThaSorOr[0].code).toBe('7440.001.0018.025');

      // Verify IBM System x3200-M3 is in server list and NOT in PC list
      expect(liveComputersKongKorHor.some((i) => i.code === '7440.001.0001.0005.7')).toBe(false);

      // Verify separated notebooks filtering
      const liveNotebooksKongKorHor = filterReportItems(parsed.items, {
        isExcelSource: false,
        type: 'คอมพิวเตอร์โน้ตบุ๊ก (Notebook)',
        bakStatusFilter: 'ใช้งานปกติ',
        bakProcurementFilter: 'กง.กห.',
      });
      // Exactly 18 active notebooks purchased by กง.กห.
      expect(liveNotebooksKongKorHor.length).toBe(18);
      expect(liveNotebooksKongKorHor.every((i) => i.procurementName === 'กง.กห.')).toBe(true);

      const liveNotebooksThaSorOr = filterReportItems(parsed.items, {
        isExcelSource: false,
        type: 'คอมพิวเตอร์โน้ตบุ๊ก (Notebook)',
        bakStatusFilter: 'ใช้งานปกติ',
        bakProcurementFilter: 'ทสอ.ฯ',
      });
      // Exactly 1 active notebook purchased by ทสอ.ฯ (Lenovo L430: 7440.001.0003.0012.7)
      expect(liveNotebooksThaSorOr.length).toBe(1);
      expect(liveNotebooksThaSorOr[0].code).toBe('7440.001.0003.0012.7');

      // Verify item 0492 is in ทสอ.ฯ PC list and NOT in กง.กห. list
      expect(liveComputersKongKorHor.some((i) => i.code === '7440.001.0001.0492')).toBe(false);
      expect(liveComputersThaSorOr.some((i) => i.code === '7440.001.0001.0492')).toBe(true);

      // Verify division filtering works
      const liveDivisionKorborNor = filterReportItems(parsed.items, {
        isExcelSource: false,
        division: 'กบน. ฯ',
      });
      expect(liveDivisionKorborNor.length).toBeGreaterThan(0);
      expect(liveDivisionKorborNor.every((i) => i.division === 'กบน. ฯ')).toBe(true);

      // Verify statusid = 1, 2, 3 counts in live .bak
      const normalItems = parsed.items.filter((i) => i.statusId === 1);
      const repairItems = parsed.items.filter((i) => i.statusId === 2);
      const returnItems = parsed.items.filter((i) => i.statusId === 3);
      expect(normalItems.length).toBe(720);
      expect(repairItems.length).toBe(2);
      expect(returnItems.length).toBe(69);

      // Verify resourceid = 1 (ทสอ.ฯ), 2 (กง.กห.) counts in live .bak
      const thaSorOrItems = parsed.items.filter((i) => i.procurementId === 1);
      const kongKorHorItems = parsed.items.filter((i) => i.procurementId === 2);
      expect(thaSorOrItems.length).toBe(36);
      expect(kongKorHorItems.length).toBe(755);
    }
  });

  it('normalizes equipment codes by removing dots, hyphens, slashes, and spaces', () => {
    expect(normalizeEquipmentCode('7440.001.0002.0139.1')).toBe('7440001000201391');
    expect(normalizeEquipmentCode('7440-001-0002-0139-1')).toBe('7440001000201391');
    expect(normalizeEquipmentCode('7440/001/0002/0139/1')).toBe('7440001000201391');
    expect(normalizeEquipmentCode('  7440 001 0002 0139 1  ')).toBe('7440001000201391');
    expect(normalizeEquipmentCode('7440.001.0002.0147')).toBe('744000100020147');
    expect(normalizeEquipmentCode('')).toBe('');
  });

  it('reconciles equipment data between .bak and Excel accurately into 4 categories', () => {
    const mockBak: BakEquipmentItem[] = [
      // 1. Matched with identical details
      {
        id: 1,
        code: '7440.001.0001',
        name: 'คอมพิวเตอร์ A',
        serial: 'SN01',
        year: '2560',
        docNo: '1/60',
        remark: '',
        deptName: 'การเงิน กง.กห.',
        unit: 'เครื่อง',
        price: 25000,
        statusId: 1,
        statusName: 'ปกติ',
        procurementId: 2,
        procurementName: 'กง.กห.',
        deptId: 1,
        type: 'คอมพิวเตอร์ (PC / All-in-one)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
        ageYears: 9,
        ageBracket: '7-14',
        ageStatusLabel: 'เริ่มเสื่อมสภาพ',
        sourceType: 'bak',
      },
      // 2. Discrepancy (same code, different year & status)
      {
        id: 2,
        code: '7440.001.0002',
        name: 'คอมพิวเตอร์ B',
        serial: 'SN02',
        year: '2559',
        docNo: '2/59',
        remark: '',
        deptName: 'การเงิน กง.กห.',
        unit: 'เครื่อง',
        price: 22000,
        statusId: 2,
        statusName: 'ส่งซ่อม',
        procurementId: 2,
        procurementName: 'กง.กห.',
        deptId: 1,
        type: 'คอมพิวเตอร์ (PC / All-in-one)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
        ageYears: 10,
        ageBracket: '7-14',
        ageStatusLabel: 'เริ่มเสื่อมสภาพ',
        sourceType: 'bak',
      },
      // 3. Only in .bak
      {
        id: 3,
        code: '7440.001.0003',
        name: 'คอมพิวเตอร์ C (เฉพาะ .bak)',
        serial: 'SN03',
        year: '2562',
        docNo: '3/62',
        remark: '',
        deptName: 'สารบรรณ',
        unit: 'เครื่อง',
        price: 28000,
        statusId: 1,
        statusName: 'ปกติ',
        procurementId: 1,
        procurementName: 'ทสอ.',
        deptId: 2,
        type: 'คอมพิวเตอร์ (PC / All-in-one)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
        ageYears: 7,
        ageBracket: '1-7',
        ageStatusLabel: 'ปกติ',
        sourceType: 'bak',
      },
    ];

    const mockExcel: BakEquipmentItem[] = [
      // 1. Matches mockBak[0] with hyphen format
      {
        id: 101,
        code: '7440-001-0001',
        name: 'คอมพิวเตอร์ A',
        serial: 'SN01',
        year: '2560',
        docNo: '1/60',
        remark: '',
        deptName: 'การเงิน กง.กห.',
        unit: 'เครื่อง',
        price: 25000,
        statusId: 1,
        statusName: 'ปกติ',
        procurementId: 2,
        procurementName: 'กง.กห.',
        deptId: 0,
        type: 'คอมพิวเตอร์ (PC / All-in-one)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
        ageYears: 9,
        ageBracket: '7-14',
        ageStatusLabel: 'เริ่มเสื่อมสภาพ',
        sourceType: 'excel',
      },
      // 2. Matches mockBak[1] with slash format but year 2560 & status ปกติ (discrepancy)
      {
        id: 102,
        code: '7440/001/0002',
        name: 'คอมพิวเตอร์ B',
        serial: 'SN02',
        year: '2560',
        docNo: '2/60',
        remark: '',
        deptName: 'การเงิน กง.กห.',
        unit: 'เครื่อง',
        price: 22000,
        statusId: 1,
        statusName: 'ปกติ',
        procurementId: 2,
        procurementName: 'กง.กห.',
        deptId: 0,
        type: 'คอมพิวเตอร์ (PC / All-in-one)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
        ageYears: 9,
        ageBracket: '7-14',
        ageStatusLabel: 'เริ่มเสื่อมสภาพ',
        sourceType: 'excel',
      },
      // 4. Only in Excel
      {
        id: 104,
        code: '7440.001.0004',
        name: 'คอมพิวเตอร์ D (เฉพาะ Excel)',
        serial: 'SN04',
        year: '2564',
        docNo: '4/64',
        remark: '',
        deptName: 'คลัง 12',
        unit: 'เครื่อง',
        price: 30000,
        statusId: 1,
        statusName: 'ปกติ',
        procurementId: 2,
        procurementName: 'กง.กห.',
        deptId: 0,
        type: 'คอมพิวเตอร์ (PC / All-in-one)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
        ageYears: 5,
        ageBracket: '1-7',
        ageStatusLabel: 'ปกติ',
        sourceType: 'excel',
      },
    ];

    const result = reconcileEquipmentData(mockBak, mockExcel);

    expect(result.totalUnique).toBe(4);
    expect(result.matchedCount).toBe(1);
    expect(result.discrepancyCount).toBe(1);
    expect(result.onlyBakCount).toBe(1);
    expect(result.onlyExcelCount).toBe(1);
    expect(result.reconciliationRate).toBe(25); // 1 / 4 * 100 = 25%

    const matchedItem = result.items.find((i) => i.status === 'matched');
    expect(matchedItem).toBeDefined();
    expect(matchedItem?.normalizedCode).toBe('74400010001');

    const discrepancyItem = result.items.find((i) => i.status === 'discrepancy');
    expect(discrepancyItem).toBeDefined();
    expect(discrepancyItem?.normalizedCode).toBe('74400010002');
    expect(discrepancyItem?.discrepancies.length).toBeGreaterThan(0);
    expect(discrepancyItem?.discrepancies.some((d) => d.field === 'year')).toBe(true);
    expect(discrepancyItem?.discrepancies.some((d) => d.field === 'status')).toBe(true);

    const onlyBakItem = result.items.find((i) => i.status === 'only_bak');
    expect(onlyBakItem).toBeDefined();
    expect(onlyBakItem?.normalizedCode).toBe('74400010003');

    const onlyExcelItem = result.items.find((i) => i.status === 'only_excel');
    expect(onlyExcelItem).toBeDefined();
    expect(onlyExcelItem?.normalizedCode).toBe('74400010004');

    // CSV generation test
    const csv = generateReconciliationCsv(result);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('รหัสครุภัณฑ์ (จับคู่)');
    expect(csv).toContain('74400010001');
    expect(csv).toContain('74400010002');
    expect(csv).toContain('ตรงกันทั้ง 2 แหล่ง 🟢');
    expect(csv).toContain('ข้อมูลขัดแย้ง 🟡');
    expect(csv).toContain('มีเฉพาะใน .bak 🔵');
    expect(csv).toContain('มีเฉพาะใน Excel 🟣');
  });
});

