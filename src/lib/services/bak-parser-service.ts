import * as XLSX from 'xlsx';
import {
  AgeBracket,
  BakEquipmentItem,
  BakParseResult,
  BakSummary,
  BakTypeBreakdown,
  BakYearBreakdown,
  BakCategoryBreakdown,
  BakAgeBreakdown,
  BakCrossTabEntry,
  BakCrossTabAgeEntry,
  ReconciliationStatus,
  ReconciliationDiscrepancy,
  ReconciliationItem,
  ReconciliationResult,
} from '@/types/bak-equipment';

const PAGE_SIZE = 8192;
export const CURRENT_FISCAL_YEAR = 2569;

// Safe little-endian binary readers that work on both Node.js Buffer and browser Uint8Array
function readUInt16LE(bytes: Uint8Array, offset: number): number {
  if (offset + 1 >= bytes.length) return 0;
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readInt32LE(bytes: Uint8Array, offset: number): number {
  if (offset + 3 >= bytes.length) return 0;
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  );
}

function readDoubleLE(bytes: Uint8Array, offset: number): number {
  if (offset + 7 >= bytes.length) return 0;
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    const val = view.getFloat64(0, true);
    return isNaN(val) ? 0 : val;
  } catch {
    return 0;
  }
}

function getDecoder(): TextDecoder {
  try {
    return new TextDecoder('windows-874');
  } catch {
    try {
      return new TextDecoder('tis-620');
    } catch {
      return new TextDecoder('utf-8');
    }
  }
}

/**
 * Calculate equipment age in years and assign official lifecycle age bracket
 */
export function calculateEquipmentAge(
  yearOrDateStr: string,
  currentYear: number = CURRENT_FISCAL_YEAR
): { ageYears: number; ageBracket: AgeBracket; ageStatusLabel: string } {
  const str = (yearOrDateStr || '').trim();
  let parsedYear = 0;

  // Case A: 4-digit BE year like "2559"
  const m4 = str.match(/\b(25\d{2})\b/);
  if (m4) {
    parsedYear = parseInt(m4[1], 10);
  } else {
    // Case B: Thai month abbreviation followed by year e.g. "28 ก.ค.52", "26 ก.ย. 2556"
    const mThai = str.match(
      /(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*'?(\d{2,4})/
    );
    if (mThai) {
      const y = parseInt(mThai[1], 10);
      parsedYear = y < 100 ? (y >= 30 ? 2500 + y : 2500 + y) : y;
    } else {
      // Case C: Standard date ending with year e.g. "28/07/52" or "28.07.2552"
      const mDateEnd = str.match(/\d{1,2}[\/\.\-]\d{1,2}[\/\.\-](\d{2,4})/);
      if (mDateEnd) {
        const y = parseInt(mDateEnd[1], 10);
        parsedYear = y < 100 ? (y >= 30 ? 2500 + y : 2500 + y) : y;
      } else {
        // Case D: Doc number ending with year e.g. "5/52" or "กห 0203.7/46"
        const mDoc = str.match(/(?:\/|\s)(\d{2})\b/);
        if (mDoc) {
          const y2 = parseInt(mDoc[1], 10);
          if (y2 >= 30 && y2 <= 99) {
            parsedYear = 2500 + y2;
          }
        }
      }
    }
  }

  if (parsedYear >= 2500 && parsedYear <= currentYear + 1) {
    const ageYears = Math.max(0, currentYear - parsedYear);
    let ageBracket: AgeBracket = '1-7';
    let ageStatusLabel = 'ใช้งานปกติ';

    if (ageYears > 14) {
      ageBracket = '14+';
      ageStatusLabel = 'เกินเกณฑ์/รอจำหน่าย';
    } else if (ageYears > 7) {
      ageBracket = '7-14';
      ageStatusLabel = 'เริ่มเสื่อมสภาพ';
    }

    return { ageYears, ageBracket, ageStatusLabel };
  }

  return { ageYears: 0, ageBracket: 'unknown', ageStatusLabel: 'ไม่ระบุปี' };
}

/**
 * Categorize equipment based on Thai government asset coding and equipment names
 */
export function classifyEquipment(
  code: string,
  rawName: string,
  sourceHint?: string
): { type: string; category: string } {
  const c = code.trim();
  const n = (rawName || '').toLowerCase();
  const hint = (sourceHint || '').toLowerCase();

  // Hint overrides for specialized files
  if (hint.includes('dot') || hint.includes('ดอท')) {
    return { type: 'เครื่องพิมพ์แบบดอทเมตริก (Dot Matrix)', category: 'ครุภัณฑ์คอมพิวเตอร์' };
  }
  if (hint.includes('inkjet')) {
    return { type: 'เครื่องพิมพ์อิงค์เจ็ท (Inkjet)', category: 'ครุภัณฑ์คอมพิวเตอร์' };
  }
  if (hint.includes('ink tank')) {
    return { type: 'เครื่องพิมพ์ Ink Tank Printer', category: 'ครุภัณฑ์คอมพิวเตอร์' };
  }
  if (hint.includes('line printer') || hint.includes('printronix')) {
    return { type: 'เครื่องพิมพ์ความเร็วสูง (Line Printer)', category: 'ครุภัณฑ์คอมพิวเตอร์' };
  }
  if (hint.includes('เลเซอร์') || hint.includes('laser')) {
    return { type: 'เครื่องพิมพ์เลเซอร์ (Laser Printer)', category: 'ครุภัณฑ์คอมพิวเตอร์' };
  }

  // 1. Enterprise Servers (คอมพิวเตอร์แม่ข่าย / เครื่องเซิร์ฟเวอร์ - รหัส 7440.001.0001.000, 7440.001.0018 หรือระบุแม่ข่าย/เซิร์ฟเวอร์)
  if (
    c.startsWith('7440.001.0001.000') ||
    c.startsWith('7440.001.0018') ||
    n.includes('server') ||
    n.includes('แม่ข่าย') ||
    n.includes('เซิร์ฟเวอร์') ||
    n.includes('เซิฟเวอร์') ||
    n.includes('system x') ||
    n.includes('sistem รุ่น x') ||
    n.includes('x3200') ||
    n.includes('x3550') ||
    n.includes('x-3650') ||
    n.includes('x3650') ||
    n.includes('supermicro') ||
    n.includes('dell emc') ||
    n.includes('p7-730') ||
    n.includes('p5 - p520') ||
    n.includes('p520') ||
    n.includes('poweredge') ||
    n.includes('proliant')
  ) {
    return {
      type: 'คอมพิวเตอร์แม่ข่าย (Server)',
      category: 'ครุภัณฑ์คอมพิวเตอร์',
    };
  }

  // 2. Notebooks & Laptops (รหัส 7440.001.0003 หรือระบุโน้ตบุ๊ก - ตรวจสอบก่อนเพื่อแยกออกจาก PC)
  if (
    c.startsWith('7440.001.0003') ||
    c.startsWith('7440.002') ||
    n.includes('โน้ตบุ๊ก') ||
    n.includes('โน๊ตบุ๊ค') ||
    n.includes('notebook') ||
    n.includes('laptop') ||
    n.includes('latitude') ||
    n.includes('vivobook') ||
    n.includes('vostro') ||
    n.includes('travelmate') ||
    n.includes('thinkpad') ||
    n.includes('porteg') ||
    n.includes('elitebook') ||
    n.includes('probook') ||
    n.includes('macbook') ||
    n.includes('asus g')
  ) {
    return {
      type: 'คอมพิวเตอร์โน้ตบุ๊ก (Notebook)',
      category: 'ครุภัณฑ์คอมพิวเตอร์',
    };
  }

  // 3. Computers (PC / All-in-one)
  if (
    c.startsWith('7440.001') ||
    n.includes('think centre') ||
    n.includes('veriton') ||
    n.includes('optiplex') ||
    n.includes('acer m') ||
    n.includes('hp pro') ||
    n.includes('hp 280') ||
    n.includes('dell gtz') ||
    n.includes('lemel') ||
    n.includes('คอมพิวเตอร์') ||
    n.includes(' all-in-one') ||
    n.includes(' pc')
  ) {
    return {
      type: 'คอมพิวเตอร์ (PC / All-in-one)',
      category: 'ครุภัณฑ์คอมพิวเตอร์',
    };
  }

  // 3. Printers & Peripherals
  if (
    c.startsWith('7440.009') ||
    n.includes('brother') ||
    n.includes('laserjet') ||
    n.includes('dot matrix') ||
    n.includes('multijunction') ||
    n.includes('เครื่องพิมพ์') ||
    n.includes('printer') ||
    n.includes('canon') ||
    n.includes('epson') ||
    n.includes('printronix')
  ) {
    if (n.includes('line printer') || n.includes('printronix')) {
      return {
        type: 'เครื่องพิมพ์ความเร็วสูง (Line Printer)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
      };
    }
    if (n.includes('dot matrix')) {
      return {
        type: 'เครื่องพิมพ์แบบดอทเมตริก (Dot Matrix)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
      };
    }
    if (n.includes('inkjet') || n.includes('pixma')) {
      return {
        type: 'เครื่องพิมพ์อิงค์เจ็ท (Inkjet)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
      };
    }
    if (n.includes('ink tank') || n.includes('t230')) {
      return {
        type: 'เครื่องพิมพ์ Ink Tank Printer',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
      };
    }
    if (n.includes('laser') || n.includes('hp 2025')) {
      return {
        type: 'เครื่องพิมพ์เลเซอร์ (Laser Printer)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
      };
    }
    return {
      type: 'เครื่องพิมพ์ (Printer)',
      category: 'ครุภัณฑ์คอมพิวเตอร์',
    };
  }

  // 4. Monitors & Displays
  if (
    c.startsWith('7440.003') ||
    n.includes('จอภาพ') ||
    n.includes('จอรับภาพ') ||
    n.includes('monitor') ||
    n.includes('led') ||
    n.includes('lcd')
  ) {
    return {
      type: 'จอภาพ (Monitor)',
      category: 'ครุภัณฑ์คอมพิวเตอร์',
    };
  }

  // 5. UPS & Power
  if (
    c.startsWith('7440.005') ||
    n.includes('สำรองไฟ') ||
    n.includes('ups') ||
    n.includes('cleanline') ||
    n.includes('syndome')
  ) {
    return {
      type: 'เครื่องสำรองไฟฟ้า (UPS)',
      category: 'ครุภัณฑ์คอมพิวเตอร์',
    };
  }

  // 6. Network & Switch
  if (
    c.startsWith('7440.004') ||
    c.startsWith('7490') ||
    n.includes('switch') ||
    n.includes('router') ||
    n.includes('สวิตช์') ||
    n.includes('กระจายสัญญาณ')
  ) {
    return {
      type: 'อุปกรณ์เครือข่าย (Network & Switch)',
      category: 'ครุภัณฑ์คอมพิวเตอร์',
    };
  }

  // 7. Scanners
  if (
    c.startsWith('7440.010') ||
    c.startsWith('7440.011') ||
    n.includes('scanner') ||
    n.includes('สแกน')
  ) {
    return {
      type: 'เครื่องสแกนเนอร์ (Scanner)',
      category: 'ครุภัณฑ์คอมพิวเตอร์',
    };
  }

  // 8. Audiovisual / Projector
  if (
    c.startsWith('7430') ||
    n.includes('projector') ||
    n.includes('โปรเจคเตอร์') ||
    n.includes('กล้อง') ||
    n.includes('ฉายภาพ')
  ) {
    return {
      type: 'อุปกรณ์โสตทัศน์/โปรเจคเตอร์',
      category: 'ครุภัณฑ์โฆษณาและเผยแพร่',
    };
  }

  // 9. Office Furniture & Equipment
  if (
    c.startsWith('7110') ||
    n.includes('โต๊ะ') ||
    n.includes('เก้าอี้') ||
    n.includes('ตู้') ||
    n.includes('คำนวณเลข') ||
    n.includes('สำนักงาน')
  ) {
    return {
      type: 'ครุภัณฑ์สำนักงาน',
      category: 'ครุภัณฑ์สำนักงาน',
    };
  }

  // 10. Electrical / Radio
  if (c.startsWith('7450')) {
    return {
      type: 'อุปกรณ์ไฟฟ้าและวิทยุ',
      category: 'ครุภัณฑ์ไฟฟ้าและวิทยุ',
    };
  }

  return {
    type: 'ครุภัณฑ์อื่นๆ',
    category: 'ครุภัณฑ์อื่นๆ',
  };
}

/**
 * Builds aggregate metrics, summaries, and cross-tabulation matrices
 */
function buildAggregatedResult(
  items: BakEquipmentItem[],
  meta: {
    fileName: string;
    fileSize: number;
    totalPagesScanned: number;
    equipmentDataPages: number;
    sourceType: 'bak' | 'excel';
    sourceFilesCount?: number;
    sourceFileNames?: string[];
  }
): BakParseResult {
  const typeMap = new Map<string, { category: string; count: number; totalValue: number }>();
  const yearMap = new Map<string, { count: number; totalValue: number }>();
  const catMap = new Map<string, { count: number; totalValue: number }>();
  const crossTabMap = new Map<string, { total: number; byType: Record<string, number> }>();
  const crossTabAgeMap = new Map<string, BakCrossTabAgeEntry>();

  let grandTotalValue = 0;
  let age1To7Count = 0;
  let age1To7Value = 0;
  let age7To14Count = 0;
  let age7To14Value = 0;
  let age14PlusCount = 0;
  let age14PlusValue = 0;
  let unknownAgeCount = 0;

  for (const item of items) {
    grandTotalValue += item.price;

    // Age counts
    if (item.ageBracket === '1-7') {
      age1To7Count++;
      age1To7Value += item.price;
    } else if (item.ageBracket === '7-14') {
      age7To14Count++;
      age7To14Value += item.price;
    } else if (item.ageBracket === '14+') {
      age14PlusCount++;
      age14PlusValue += item.price;
    } else {
      unknownAgeCount++;
    }

    // Type
    const tEntry = typeMap.get(item.type) || {
      category: item.category,
      count: 0,
      totalValue: 0,
    };
    tEntry.count += 1;
    tEntry.totalValue += item.price;
    typeMap.set(item.type, tEntry);

    // Year
    const yEntry = yearMap.get(item.year) || { count: 0, totalValue: 0 };
    yEntry.count += 1;
    yEntry.totalValue += item.price;
    yearMap.set(item.year, yEntry);

    // Category
    const cEntry = catMap.get(item.category) || { count: 0, totalValue: 0 };
    cEntry.count += 1;
    cEntry.totalValue += item.price;
    catMap.set(item.category, cEntry);

    // Cross-tab (Year x Type)
    const ctEntry = crossTabMap.get(item.year) || { total: 0, byType: {} };
    ctEntry.total += 1;
    ctEntry.byType[item.type] = (ctEntry.byType[item.type] || 0) + 1;
    crossTabMap.set(item.year, ctEntry);

    // Cross-tab (Type x Age Bracket)
    const ctaEntry = crossTabAgeMap.get(item.type) || {
      type: item.type,
      category: item.category,
      total: 0,
      age1To7: 0,
      age7To14: 0,
      age14Plus: 0,
      unknownAge: 0,
    };
    ctaEntry.total += 1;
    if (item.ageBracket === '1-7') ctaEntry.age1To7++;
    else if (item.ageBracket === '7-14') ctaEntry.age7To14++;
    else if (item.ageBracket === '14+') ctaEntry.age14Plus++;
    else ctaEntry.unknownAge++;
    crossTabAgeMap.set(item.type, ctaEntry);
  }

  const totalCount = items.length;

  const byType: BakTypeBreakdown[] = Array.from(typeMap.entries())
    .map(([type, data]) => ({
      type,
      category: data.category,
      count: data.count,
      totalValue: Math.round(data.totalValue * 100) / 100,
      percent: totalCount > 0 ? Math.round((data.count / totalCount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const byYear: BakYearBreakdown[] = Array.from(yearMap.entries())
    .map(([year, data]) => ({
      year,
      count: data.count,
      totalValue: Math.round(data.totalValue * 100) / 100,
      percent: totalCount > 0 ? Math.round((data.count / totalCount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => {
      if (a.year === 'ไม่ระบุปี') return 1;
      if (b.year === 'ไม่ระบุปี') return -1;
      return a.year.localeCompare(b.year);
    });

  const byCategory: BakCategoryBreakdown[] = Array.from(catMap.entries())
    .map(([category, data]) => ({
      category,
      count: data.count,
      totalValue: Math.round(data.totalValue * 100) / 100,
      percent: totalCount > 0 ? Math.round((data.count / totalCount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const byAge: BakAgeBreakdown[] = [
    {
      bracket: '1-7',
      label: '1 - 7 ปี (ใช้งานปกติ)',
      count: age1To7Count,
      totalValue: Math.round(age1To7Value * 100) / 100,
      percent: totalCount > 0 ? Math.round((age1To7Count / totalCount) * 1000) / 10 : 0,
      color: 'emerald',
    },
    {
      bracket: '7-14',
      label: '7 - 14 ปี (เริ่มเสื่อมสภาพ)',
      count: age7To14Count,
      totalValue: Math.round(age7To14Value * 100) / 100,
      percent: totalCount > 0 ? Math.round((age7To14Count / totalCount) * 1000) / 10 : 0,
      color: 'amber',
    },
    {
      bracket: '14+',
      label: '14 ปีขึ้นไป (เกินเกณฑ์/รอจำหน่าย)',
      count: age14PlusCount,
      totalValue: Math.round(age14PlusValue * 100) / 100,
      percent: totalCount > 0 ? Math.round((age14PlusCount / totalCount) * 1000) / 10 : 0,
      color: 'red',
    },
    {
      bracket: 'unknown',
      label: 'ไม่ระบุปีงบประมาณ',
      count: unknownAgeCount,
      totalValue: 0,
      percent: totalCount > 0 ? Math.round((unknownAgeCount / totalCount) * 1000) / 10 : 0,
      color: 'slate',
    },
  ];

  const crossTab: BakCrossTabEntry[] = Array.from(crossTabMap.entries())
    .map(([year, data]) => ({
      year,
      total: data.total,
      byType: data.byType,
    }))
    .sort((a, b) => {
      if (a.year === 'ไม่ระบุปี') return 1;
      if (b.year === 'ไม่ระบุปี') return -1;
      return a.year.localeCompare(b.year);
    });

  const crossTabAge: BakCrossTabAgeEntry[] = Array.from(crossTabAgeMap.values()).sort(
    (a, b) => b.total - a.total
  );

  const numericYears = byYear
    .map((y) => parseInt(y.year, 10))
    .filter((y) => !isNaN(y) && y >= 2500 && y <= 2600)
    .sort((a, b) => a - b);

  const yearMin = numericYears.length > 0 ? String(numericYears[0]) : '-';
  const yearMax = numericYears.length > 0 ? String(numericYears[numericYears.length - 1]) : '-';
  const yearSpan = yearMin !== '-' && yearMax !== '-' ? `${yearMin} - ${yearMax}` : 'หลากหลายปี';

  const summary: BakSummary = {
    totalCount,
    totalValue: Math.round(grandTotalValue * 100) / 100,
    uniqueTypesCount: byType.length,
    uniqueCategoriesCount: byCategory.length,
    yearSpan,
    yearMin,
    yearMax,
    age1To7Count,
    age1To7Value: Math.round(age1To7Value * 100) / 100,
    age7To14Count,
    age7To14Value: Math.round(age7To14Value * 100) / 100,
    age14PlusCount,
    age14PlusValue: Math.round(age14PlusValue * 100) / 100,
    unknownAgeCount,
  };

  const availableFiles =
    meta.sourceFileNames && meta.sourceFileNames.length > 0
      ? meta.sourceFileNames
      : Array.from(new Set(items.map((i) => i.sourceFile).filter(Boolean) as string[]));

  return {
    ...meta,
    items,
    summary,
    byType,
    byYear,
    byCategory,
    byAge,
    crossTab,
    crossTabAge,
    availableTypes: byType.map((t) => t.type),
    availableYears: byYear.map((y) => y.year),
    availableCategories: byCategory.map((c) => c.category),
    availableFiles,
    availableStatuses: Array.from(new Set(items.map((i) => i.statusName).filter(Boolean) as string[])),
    availableProcurements: Array.from(new Set(items.map((i) => i.procurementName).filter(Boolean) as string[])),
    availableDivisions: Array.from(new Set(items.map((i) => i.division).filter(Boolean) as string[])).sort(),
  };
}

export const STATUS_MAP: Record<number, string> = {
  1: 'ใช้งานปกติ',
  2: 'ส่งซ่อม',
  3: 'ส่งคืน',
};

export const RESOURCE_MAP: Record<number, string> = {
  1: 'ทสอ.ฯ',
  2: 'กง.กห.',
  3: 'สม.',
};

export const DIVISION_MAP: Record<number, string> = {
  1: 'กลาง. ฯ',
  2: 'กวก. ฯ',
  3: 'กจก. ฯ',
  4: 'กบง. ฯ',
  5: 'กคจ. ฯ',
  6: 'กบน. ฯ',
  7: 'กกมง. ฯ',
  8: 'สกง. ฯ',
  9: 'ธุรการ',
  10: 'สง.งป. ฯ',
  11: 'นปก. ฯ',
  12: 'สารบรรณ',
  13: 'สำนักงานผู้บังคับบัญชา',
  14: 'นธน. ฯ',
  15: 'นตส. ฯ',
  16: 'กบจพ. ฯ',
  17: 'กงดพ. ฯ',
  18: 'นถปภ.รอ.',
  19: 'ห้องซ่อมบำรุงด้านใน กกมง.ฯ',
  20: 'ห้องเก็บของด้านนอก',
  21: 'โครงการ นถปภ.รอ. ตู้ A12 ชั้น 11',
  22: 'เครื่องคอมพิวเตอร์แม่ข่าย (SERVER)',
  23: 'เครื่องประมวลผลเงินเดือน',
  24: 'ทดสอบระบบ',
  27: 'กกงพ.กง.กห.',
  28: 'กกงพ. ฯ',
  29: 'ส่งคืน กลาง.กง.กห. รอจำหน่าย',
  30: 'ส่งคืน กลาง.กง.กห. รอจำหน่าย',
  31: 'ส่งคืน กลาง.กง.กห.',
};

export const OS_MAP: Record<number, string> = {
  1: 'Windows XP',
  2: 'Windows 8',
  3: 'Windows 10',
  4: 'Windows Server2012',
  6: 'Windows 7',
};

export const PROJECT_MAP: Record<number, string> = {
  1: 'บัญชี',
  2: 'เบี้ยหวัด/บำเหน็จบำนาญ',
  3: 'ระบบควบคุมฯ',
  4: 'ระบบเงินเดือน',
  5: 'ระบบ เงินนอก/เงินใน',
  6: 'ระบบ นถปภ.รอ.',
  7: 'ระบบการจัดการฐานข้อมูล',
  9: 'ระบบสารบรรณอิเล็กทรอนิกส์',
  10: 'ระบบใบจ่ายเงินเดือนอิเล็กทรอนิกส์',
  11: 'โปรแกรมครุภัณฑ์',
};

/**
 * Parse Microsoft SQL Server Tape Format (.bak) file containing equipment data
 */
export function parseBakBuffer(
  input: Uint8Array | ArrayBuffer | Buffer,
  fileName: string = 'database.bak',
  currentYear: number = CURRENT_FISCAL_YEAR
): BakParseResult {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const totalPages = Math.floor(bytes.length / PAGE_SIZE);
  const decoder = getDecoder();

  const uniqueMap = new Map<string, BakEquipmentItem>();
  let dataPagesCount = 0;

  for (let p = 0; p < totalPages; p++) {
    const pageOffset = p * PAGE_SIZE;

    // Check page header: byte 0 = m_headerVersion (1), byte 1 = m_type (1: data page)
    if (bytes[pageOffset] !== 1 || bytes[pageOffset + 1] !== 1) {
      continue;
    }

    dataPagesCount++;

    // Read slot offsets from bottom of page
    for (let s = 1; s < 250; s++) {
      const slotIndexOffset = pageOffset + PAGE_SIZE - 2 * s;
      if (slotIndexOffset < pageOffset + 96) break;

      const offsetInPage = readUInt16LE(bytes, slotIndexOffset);
      if (offsetInPage < 96 || offsetInPage >= PAGE_SIZE) break;

      const recOffset = pageOffset + offsetInPage;
      if (recOffset + 100 > pageOffset + PAGE_SIZE) continue;

      // Status byte: 0x30 has null bitmap and variable columns
      const statusA = bytes[recOffset];
      if (statusA !== 0x30) continue;

      // Fixed length portion size (supports both 81 and 85)
      const fixedLen = readUInt16LE(bytes, recOffset + 2);
      if (fixedLen !== 81 && fixedLen !== 85) continue;

      // Column count (supports both 27 and 31)
      const numCols = readUInt16LE(bytes, recOffset + fixedLen);
      if (numCols !== 27 && numCols !== 31) continue;

      // Soft-delete flag: byte 32 & 0x01 === 1 means IsDelete = true (skip soft-deleted records)
      const isDelete = (bytes[recOffset + 32] & 0x01) === 1;
      if (isDelete) continue;

      // Null bitmap length
      const nullBytes = Math.ceil(numCols / 8);
      const varOff = recOffset + fixedLen + 2 + nullBytes;
      const numVar = readUInt16LE(bytes, varOff);
      if (numVar < 4) continue;

      // Read variable column offsets
      const varOffsets: number[] = [];
      for (let v = 0; v < numVar; v++) {
        varOffsets.push(readUInt16LE(bytes, varOff + 2 + 2 * v));
      }

      let prev = fixedLen + 2 + nullBytes + 2 + 2 * numVar;
      const varVals: string[] = [];

      for (const vo of varOffsets) {
        if (vo >= prev && recOffset + vo <= pageOffset + PAGE_SIZE) {
          const colBytes = bytes.subarray(recOffset + prev, recOffset + vo);
          varVals.push(decoder.decode(colBytes).trim());
          prev = vo;
        } else {
          varVals.push('');
        }
      }

      // Read fixed fields
      const eqId = readInt32LE(bytes, recOffset + 4);
      const rawPrice = readDoubleLE(bytes, recOffset + 16);
      const price = rawPrice >= 0 && rawPrice < 10000000 ? Math.round(rawPrice * 100) / 100 : 0;
      
      // Offset 24 = ResourceId (หน่วยจัดซื้อ: 1: ทสอ.ฯ, 2: กง.กห., 3: สม.)
      const procId = readInt32LE(bytes, recOffset + 24);
      const procurementName = RESOURCE_MAP[procId] || (procId > 0 ? `หน่วย ${procId}` : 'ไม่ระบุ');

      // Offset 28 = DepartmentId (กอง: เช่น กบน.ฯ, กคจ.ฯ, กลาง.ฯ, ส่งคืน กลาง.กง.กห. รอจำหน่าย)
      const deptId = readInt32LE(bytes, recOffset + 28);
      const division = DIVISION_MAP[deptId] || (deptId > 0 ? `กอง ${deptId}` : '');

      // Offset 57 = StatusId (สถานะ: 1: ใช้งานปกติ, 2: ส่งซ่อม, 3: ส่งคืน)
      const statusId = readInt32LE(bytes, recOffset + 57);
      const statusName = STATUS_MAP[statusId] || (statusId > 0 ? `สถานะ ${statusId}` : 'ไม่ระบุ');

      // Offset 61 = OsId (ระบบปฏิบัติการ)
      const osId = readInt32LE(bytes, recOffset + 61);
      const osName = OS_MAP[osId] || '';

      // Offset 65 = ProjectId (ระบบงาน)
      const projectId = readInt32LE(bytes, recOffset + 65);
      const projectName = PROJECT_MAP[projectId] || '';

      const code = (varVals[0] || '').trim();
      const name = (varVals[1] || '').trim();
      const serial = (varVals[2] || '').trim();
      let year = (varVals[3] || '').trim();
      if (!year || year === '0') year = 'ไม่ระบุปี';

      const docNo = (varVals[4] || '').trim();
      const remark = (varVals[7] || '').trim();
      const deptName = (varVals[8] || '').trim(); // แผนก
      const cpu = (varVals[9] || '').trim();
      const ram = (varVals[10] || '').trim();
      const unit = (varVals[12] || '').trim() || 'เครื่อง';

      if (!code) continue;

      const { type, category } = classifyEquipment(code, name);
      const { ageYears, ageBracket, ageStatusLabel } = calculateEquipmentAge(year, currentYear);

      const equipmentItem: BakEquipmentItem = {
        id: eqId,
        code,
        name,
        serial,
        year,
        docNo,
        remark,
        deptName,
        division,
        unit,
        price,
        statusId,
        statusName,
        procurementId: procId,
        procurementName,
        deptId,
        osId,
        osName,
        projectId,
        projectName,
        cpu,
        ram,
        type,
        category,
        ageYears,
        ageBracket,
        ageStatusLabel,
        sourceFile: fileName,
        sourceType: 'bak',
      };

      // Deduplicate by code: keep the active item with higher id / latest in stream
      const existing = uniqueMap.get(code);
      if (!existing || eqId >= existing.id) {
        uniqueMap.set(code, equipmentItem);
      }
    }
  }

  const items = Array.from(uniqueMap.values());

  return buildAggregatedResult(items, {
    fileName,
    fileSize: bytes.length,
    totalPagesScanned: totalPages,
    equipmentDataPages: dataPagesCount,
    sourceType: 'bak',
    sourceFilesCount: 1,
    sourceFileNames: [fileName],
  });
}

/**
 * Parse one or multiple Excel files (.xls, .xlsx) in standard Thai government asset format
 */
export function parseExcelFiles(
  files: { name: string; buffer: Uint8Array | Buffer }[],
  currentYear: number = CURRENT_FISCAL_YEAR
): BakParseResult {
  const mergedMap = new Map<string, BakEquipmentItem>();
  let totalBytes = 0;
  let fileIdSeq = 1;

  for (const f of files) {
    totalBytes += f.buffer.length;
    try {
      const wb = XLSX.read(f.buffer, { type: 'buffer' });
      // Search in all sheets or primary sheet
      for (const sname of wb.SheetNames) {
        // Skip secondary duplicate sheets if Sheet1 exists with master rows
        if (wb.SheetNames.length > 1 && sname !== 'Sheet1' && sname !== wb.SheetNames[0]) {
          // Check if sheet has independent unique rows
          if (wb.SheetNames.includes('Sheet1') && sname !== 'Sheet1') continue;
        }

        const sheet = wb.Sheets[sname];
        if (!sheet) continue;

        const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        if (!data || data.length < 5) continue;

        // Find header row containing 'เลขที่หรือรหัส'
        let headerRowIdx = -1;
        for (let r = 0; r < Math.min(10, data.length); r++) {
          const row = data[r];
          if (Array.isArray(row) && row.some((c) => c && c.toString().includes('เลขที่หรือรหัส'))) {
            headerRowIdx = r;
            break;
          }
        }

        if (headerRowIdx === -1) continue;

        const hRow = data[headerRowIdx];
        const hRow2 = data[headerRowIdx + 1] || [];

        let colIdxCode = hRow.findIndex((c) => c && c.toString().includes('เลขที่หรือรหัส'));
        let colIdxDate = hRow.findIndex((c) => c && c.toString().includes('วัน เดือน ปี'));
        let colIdxName = hRow.findIndex((c) => c && c.toString().includes('ยี่ห้อ'));
        let colIdxSerial = hRow.findIndex((c) => c && c.toString().includes('หมายเลข'));
        let colIdxPrice = hRow.findIndex((c) => c && c.toString().includes('ราคา'));
        let colIdxDept = hRow.findIndex((c) => c && c.toString().includes('ใช้ประจำที่'));
        let colIdxDoc = hRow.findIndex(
          (c) => c && c.toString().includes('เลขที่') && !c.toString().includes('เลขที่หรือรหัส')
        );
        let colIdxRemark = hRow.findIndex((c) => c && c.toString().includes('หมายเหตุ'));

        if (colIdxName === -1) {
          colIdxName = hRow2.findIndex((c: any) => c && c.toString().includes('ขนาดและลักษณะ'));
        }
        if (colIdxPrice === -1) {
          colIdxPrice = hRow2.findIndex((c: any) => c && c.toString().includes('ต่อหน่วย'));
        }
        if (colIdxDoc === -1) {
          colIdxDoc = hRow2.findIndex((c: any) => c && c.toString().includes('เอกสาร'));
        }

        // Iterate data rows
        for (let r = headerRowIdx + 1; r < data.length; r++) {
          const row = data[r];
          if (!Array.isArray(row) || row.length === 0) continue;

          // Skip subtitle header rows
          if (
            row.some(
              (c) => c && (c.toString().includes('ขนาดและลักษณะ') || c.toString().includes('ต่อหน่วย'))
            )
          ) {
            continue;
          }

          let code = (colIdxCode !== -1 ? row[colIdxCode] : '')?.toString().trim() || '';
          if (!code) {
            for (const cell of row) {
              if (cell && /^\d{4}[\.\-]\d{3}/.test(cell.toString().trim())) {
                code = cell.toString().trim();
                break;
              }
            }
          }

          if (!code) continue;

          let name = (colIdxName !== -1 ? row[colIdxName] : '')?.toString().trim() || '';
          if (!name) {
            for (let c = colIdxCode + 1; c < row.length; c++) {
              if (
                row[c] &&
                typeof row[c] === 'string' &&
                row[c].trim().length > 2 &&
                !row[c].includes('.-')
              ) {
                name = row[c].trim();
                break;
              }
            }
          }

          const rawDate = (colIdxDate !== -1 ? row[colIdxDate] : '')?.toString().trim() || '';
          const rawDoc = (colIdxDoc !== -1 ? row[colIdxDoc] : '')?.toString().trim() || '';
          const serial = (colIdxSerial !== -1 ? row[colIdxSerial] : '')?.toString().trim() || '';
          const rawPrice = (colIdxPrice !== -1 ? row[colIdxPrice] : '')?.toString().trim() || '0';
          const dept = (colIdxDept !== -1 ? row[colIdxDept] : '')?.toString().trim() || '';
          const remark = (colIdxRemark !== -1 ? row[colIdxRemark] : '')?.toString().trim() || '';

          // Parse price
          const cleanPriceStr = rawPrice.replace(/[^0-9.]/g, '');
          const price = parseFloat(cleanPriceStr) || 0;

          // Extract Year from Date or Doc
          let year = 'ไม่ระบุปี';
          const { ageYears, ageBracket, ageStatusLabel } = calculateEquipmentAge(
            rawDate || rawDoc,
            currentYear
          );

          if (ageBracket !== 'unknown') {
            const calculatedYear = currentYear - ageYears;
            year = String(calculatedYear);
          } else {
            // Attempt fallback extraction from doc
            const mDoc = rawDoc.match(/\b(\d{2})\b/);
            if (mDoc) {
              const y2 = parseInt(mDoc[1], 10);
              if (y2 >= 30 && y2 <= 99) {
                year = String(2500 + y2);
              }
            }
          }

          const { type, category } = classifyEquipment(code, name, f.name);

          // Unique key by code + serial to prevent duplicates across sheets
          const uniqueKey = `${code}_${serial}_${f.name}`;
          if (!mergedMap.has(uniqueKey)) {
            mergedMap.set(uniqueKey, {
              id: fileIdSeq++,
              code,
              name: name || f.name.replace(/\.xls[x]?$/i, ''),
              serial,
              year,
              docNo: rawDoc,
              remark,
              deptName: dept,
              unit: 'เครื่อง',
              price,
              statusId: 1,
              statusName: 'ปกติ',
              procurementId: 2,
              procurementName: 'กง.กห.',
              deptId: 0,
              type,
              category,
              ageYears,
              ageBracket,
              ageStatusLabel,
              sourceFile: f.name,
              sourceType: 'excel',
            });
          }
        }
      }
    } catch (err) {
      console.warn(`Error parsing file ${f.name}:`, err);
    }
  }

  const items = Array.from(mergedMap.values());
  const fileNames = files.map((f) => f.name);

  return buildAggregatedResult(items, {
    fileName: files.length === 1 ? files[0].name : `ชุดทะเบียนครุภัณฑ์ (${files.length} ไฟล์)`,
    fileSize: totalBytes,
    totalPagesScanned: files.length,
    equipmentDataPages: files.length,
    sourceType: 'excel',
    sourceFilesCount: files.length,
    sourceFileNames: fileNames,
  });
}

/**
 * Generate CSV Report string with UTF-8 BOM for Microsoft Excel compatibility
 */
export function generateBakCsvReport(items: BakEquipmentItem[]): string {
  const headers = [
    'ลำดับ',
    'รหัสครุภัณฑ์',
    'ชื่อครุภัณฑ์',
    'หน่วยจัดซื้อ',
    'กอง',
    'แผนก',
    'ระบบงาน',
    'ระบบปฏิบัติการ',
    'สถานะการใช้งาน',
    'ปีที่จัดซื้อ',
    'อายุใช้งาน (ปี)',
    'สถานะอายุ',
    'CPU',
    'RAM',
    'ประเภท',
    'หมวดหมู่',
    'หมายเลขเครื่อง/Serial',
    'ราคาต่อหน่วย (บาท)',
    'หน่วยนับ',
    'เลขที่เอกสารจัดซื้อ',
    'หมายเหตุ',
    'ไฟล์ต้นทาง',
  ];

  const rows = items.map((item, idx) => {
    return [
      idx + 1,
      `"${(item.code || '').replace(/"/g, '""')}"`,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${item.procurementName || 'ทสอ.ฯ'}"`,
      `"${(item.division || '').replace(/"/g, '""')}"`,
      `"${(item.deptName || '').replace(/"/g, '""')}"`,
      `"${(item.projectName || '').replace(/"/g, '""')}"`,
      `"${(item.osName || '').replace(/"/g, '""')}"`,
      `"${item.statusName || 'ใช้งานปกติ'}"`,
      `"${(item.year || '').replace(/"/g, '""')}"`,
      item.ageYears > 0 ? item.ageYears : '-',
      `"${item.ageStatusLabel}"`,
      `"${(item.cpu || '').replace(/"/g, '""')}"`,
      `"${(item.ram || '').replace(/"/g, '""')}"`,
      `"${(item.type || '').replace(/"/g, '""')}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(item.serial || '').replace(/"/g, '""')}"`,
      item.price.toFixed(2),
      `"${(item.unit || 'เครื่อง').replace(/"/g, '""')}"`,
      `"${(item.docNo || '').replace(/"/g, '""')}"`,
      `"${(item.remark || '').replace(/"/g, '""')}"`,
      `"${(item.sourceFile || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  // UTF-8 BOM \uFEFF ensures Excel displays Thai characters properly without mojibake
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

/**
 * Checks if a department / location name corresponds to "คลัง 12" (Warehouse 12)
 */
export function isWarehouse12(deptName?: string | null): boolean {
  if (!deptName) return false;
  return /คลัง\s*12/i.test(deptName.trim());
}

export interface ReportFilterOptions {
  category?: string;
  type?: string;
  division?: string; // กอง เช่น 'กบน. ฯ', 'กคจ. ฯ', 'กลาง. ฯ'
  ageBracket?: string;
  yearStart?: string | number;
  yearEnd?: string | number;
  excludeWarehouse12ForExcel?: boolean;
  isExcelSource?: boolean;
  // Specific filters for Microsoft SQL Server .bak data source
  bakStatusFilter?: string; // e.g. 'ใช้งานปกติ' (default for .bak) or 'all'
  bakProcurementFilter?: string; // e.g. 'all' (default for .bak) or 'กง.กห.', 'ทสอ.ฯ', 'สม.'
  bakIncludeDeptMatch?: boolean; // legacy compatibility: strict procurement matching is now enforced
}

/**
 * Filter items for the official printable report.
 * - If source is Excel, items located in "คลัง 12" are excluded by default (toggleable).
 * - If source is .bak, filter items by status (statusid 1:ปกติ/ใช้งานปกติ, 2:ส่งซ่อม, 3:ส่งคืน), strict procurement unit (resourceid 1:ทสอ.ฯ, 2:กง.กห., 3:สม.), and division (กอง).
 * - Also sorts items by oldest-first (descending by ageYears).
 */
export function filterReportItems(
  items: BakEquipmentItem[],
  options?: ReportFilterOptions
): BakEquipmentItem[] {
  const excludeWh12 = options?.excludeWarehouse12ForExcel !== false;
  const isExcel = options?.isExcelSource ?? false;

  const filtered = items.filter((item) => {
    // 1. Exclude Warehouse 12 if source is Excel
    if (excludeWh12 && (isExcel || item.sourceType === 'excel') && isWarehouse12(item.deptName)) {
      return false;
    }

    // 2. Filter for .bak source: สถานะ และ หน่วยจัดซื้อ
    if (!isExcel && (item.sourceType === 'bak' || !item.sourceType)) {
      // 2.1 Status Filter (statusid = 1:ปกติ, 2:ส่งซ่อม, 3:ส่งคืน)
      if (options?.bakStatusFilter && options.bakStatusFilter !== 'all') {
        const targetStatus = options.bakStatusFilter;
        const matchesStatus =
          item.statusName === targetStatus ||
          ((targetStatus === 'ปกติ' || targetStatus === 'ใช้งานปกติ') &&
            (item.statusId === 1 || !item.statusId || item.statusName === 'ปกติ' || item.statusName === 'ใช้งานปกติ')) ||
          (targetStatus === 'ส่งซ่อม' && (item.statusId === 2 || item.statusName === 'ส่งซ่อม')) ||
          (targetStatus === 'ส่งคืน' && (item.statusId === 3 || item.statusName === 'ส่งคืน'));
        if (!matchesStatus) return false;
      }

      // 2.2 Strict Procurement Filter (resourceid = 1:ทสอ.ฯ, 2:กง.กห., 3:สม.)
      if (options?.bakProcurementFilter && options.bakProcurementFilter !== 'all') {
        const targetProc = options.bakProcurementFilter;
        if (targetProc === 'ทสอ.' || targetProc === 'ทสอ.ฯ') {
          const isProc =
            item.procurementId === 1 ||
            item.procurementName === 'ทสอ.' ||
            item.procurementName === 'ทสอ.ฯ';
          if (!isProc) return false;
        } else if (targetProc === 'กง.กห.') {
          const isProc = item.procurementId === 2 || item.procurementName === 'กง.กห.';
          if (!isProc) return false;
        } else if (targetProc === 'สม.') {
          const isProc = item.procurementId === 3 || item.procurementName === 'สม.';
          if (!isProc) return false;
        } else {
          if (item.procurementName !== targetProc && item.procurementId?.toString() !== targetProc) {
            return false;
          }
        }
      }

      // 2.3 Division Filter (กอง)
      if (options?.division && options.division !== 'all') {
        if (item.division !== options.division) return false;
      }
    }

    // 3. Category
    if (options?.category && options.category !== 'all' && item.category !== options.category) {
      return false;
    }

    // 4. Type
    if (options?.type && options.type !== 'all' && item.type !== options.type) {
      return false;
    }

    // 5. Age Bracket
    if (options?.ageBracket && options.ageBracket !== 'all' && item.ageBracket !== options.ageBracket) {
      return false;
    }

    // 6. Year Range
    const yNum = parseInt(item.year, 10);
    if (options?.yearStart) {
      const yStart = typeof options.yearStart === 'number' ? options.yearStart : parseInt(options.yearStart, 10);
      if (!isNaN(yStart) && (!yNum || yNum < yStart)) return false;
    }
    if (options?.yearEnd) {
      const yEnd = typeof options.yearEnd === 'number' ? options.yearEnd : parseInt(options.yearEnd, 10);
      if (!isNaN(yEnd) && (!yNum || yNum > yEnd)) return false;
    }

    return true;
  });

  // Sort: Oldest First (Descending by ageYears)
  filtered.sort((a, b) => {
    const ageA = a.ageYears || 0;
    const ageB = b.ageYears || 0;
    if (ageB !== ageA) return ageB - ageA;
    return (a.code || '').localeCompare(b.code || '');
  });

  return filtered;
}

/**
 * Counts items in "คลัง 12" that match the given filter scope and were excluded
 */
export function countWarehouse12Excluded(
  items: BakEquipmentItem[],
  options?: Omit<ReportFilterOptions, 'excludeWarehouse12ForExcel'>
): number {
  const isExcel = options?.isExcelSource ?? false;
  return items.filter((item) => {
    // Must be Excel source
    if (!isExcel && item.sourceType !== 'excel') return false;
    // Must be Warehouse 12
    if (!isWarehouse12(item.deptName)) return false;

    // Must match category if specified
    if (options?.category && options.category !== 'all' && item.category !== options.category) {
      return false;
    }
    // Must match type if specified
    if (options?.type && options.type !== 'all' && item.type !== options.type) {
      return false;
    }
    // Must match age bracket if specified
    if (options?.ageBracket && options.ageBracket !== 'all' && item.ageBracket !== options.ageBracket) {
      return false;
    }
    // Must match year range if specified
    const yNum = parseInt(item.year, 10);
    if (options?.yearStart) {
      const yStart = typeof options.yearStart === 'number' ? options.yearStart : parseInt(options.yearStart, 10);
      if (!isNaN(yStart) && (!yNum || yNum < yStart)) return false;
    }
    if (options?.yearEnd) {
      const yEnd = typeof options.yearEnd === 'number' ? options.yearEnd : parseInt(options.yearEnd, 10);
      if (!isNaN(yEnd) && (!yNum || yNum > yEnd)) return false;
    }

    return true;
  }).length;
}

/**
 * Normalizes an equipment code for robust cross-data matching.
 * Removes '.', '-', '/', spaces, and invisible zero-width chars, then converts to uppercase.
 * Example: "7440.001.0002.0139.1" -> "7440001000201391"
 * Example: "7440-001-0002-0139/1" -> "7440001000201391"
 */
export function normalizeEquipmentCode(code: string): string {
  if (!code) return '';
  return code.replace(/[\.\-\/\s\u200B-\u200D\uFEFF]/g, '').trim().toUpperCase();
}

/**
 * Reconciles equipment data between .bak (database) and Excel (inventory registers).
 * Matches by normalized EquipmentCode.
 * Classifies items into 4 categories:
 * - matched: Present in both, key attributes align.
 * - discrepancy: Present in both, but key attributes differ (e.g. year, dept, status, serial).
 * - only_bak: Present in .bak, but missing from Excel.
 * - only_excel: Present in Excel, but missing from .bak.
 */
export function reconcileEquipmentData(
  bakItems: BakEquipmentItem[],
  excelItems: BakEquipmentItem[]
): ReconciliationResult {
  const bakMap = new Map<string, BakEquipmentItem>();
  for (const item of bakItems) {
    const norm = normalizeEquipmentCode(item.code);
    if (norm && !bakMap.has(norm)) {
      bakMap.set(norm, item);
    }
  }

  const excelMap = new Map<string, BakEquipmentItem>();
  for (const item of excelItems) {
    const norm = normalizeEquipmentCode(item.code);
    if (norm && !excelMap.has(norm)) {
      excelMap.set(norm, item);
    }
  }

  const allNormCodes = Array.from(new Set([...bakMap.keys(), ...excelMap.keys()]));
  const items: ReconciliationItem[] = [];

  for (const norm of allNormCodes) {
    const bak = bakMap.get(norm);
    const excel = excelMap.get(norm);

    if (bak && excel) {
      const discrepancies: ReconciliationDiscrepancy[] = [];

      // Check year
      const bakYear = (bak.year || '').trim();
      const excelYear = (excel.year || '').trim();
      if (bakYear && excelYear && bakYear !== 'ไม่ระบุปี' && excelYear !== 'ไม่ระบุปี' && bakYear !== excelYear) {
        discrepancies.push({
          field: 'year',
          fieldLabel: 'ปีงบประมาณ',
          bakValue: bakYear,
          excelValue: excelYear,
        });
      }

      // Check serial (if both have meaningful serials)
      const bakSerial = (bak.serial || '').trim();
      const excelSerial = (excel.serial || '').trim();
      if (bakSerial && excelSerial && bakSerial !== '-' && excelSerial !== '-' && bakSerial !== excelSerial) {
        discrepancies.push({
          field: 'serial',
          fieldLabel: 'หมายเลขเครื่อง (S/N)',
          bakValue: bakSerial,
          excelValue: excelSerial,
        });
      }

      // Check status (normalize 'ใช้งานปกติ' and 'ปกติ' to avoid false discrepancy)
      const bakStatus = (bak.statusName || '').trim();
      const excelStatus = (excel.statusName || '').trim();
      const normBakStatus = bakStatus.replace(/^ใช้งานปกติ$/, 'ปกติ');
      const normExcelStatus = excelStatus.replace(/^ใช้งานปกติ$/, 'ปกติ');
      if (normBakStatus && normExcelStatus && normBakStatus !== normExcelStatus) {
        discrepancies.push({
          field: 'status',
          fieldLabel: 'สถานะการใช้งาน',
          bakValue: bakStatus,
          excelValue: excelStatus,
        });
      }

      // Check location / department (if significantly different)
      const bakDept = (bak.deptName || '').trim();
      const excelDept = (excel.deptName || '').trim();
      if (bakDept && excelDept && bakDept !== excelDept) {
        discrepancies.push({
          field: 'dept',
          fieldLabel: 'หน่วยงาน / ที่ตั้ง',
          bakValue: bakDept,
          excelValue: excelDept,
        });
      }

      const status: ReconciliationStatus = discrepancies.length > 0 ? 'discrepancy' : 'matched';

      items.push({
        id: norm,
        normalizedCode: norm,
        code: bak.code || excel.code,
        name: bak.name || excel.name,
        type: bak.type || excel.type,
        category: bak.category || excel.category,
        status,
        discrepancies,
        bakItem: bak,
        excelItem: excel,
      });
    } else if (bak && !excel) {
      items.push({
        id: norm,
        normalizedCode: norm,
        code: bak.code,
        name: bak.name,
        type: bak.type,
        category: bak.category,
        status: 'only_bak',
        discrepancies: [],
        bakItem: bak,
      });
    } else if (!bak && excel) {
      items.push({
        id: norm,
        normalizedCode: norm,
        code: excel.code,
        name: excel.name,
        type: excel.type,
        category: excel.category,
        status: 'only_excel',
        discrepancies: [],
        excelItem: excel,
      });
    }
  }

  // Sort items: discrepancy first, then matched, then only_bak, then only_excel
  const statusPriority: Record<ReconciliationStatus, number> = {
    discrepancy: 1,
    matched: 2,
    only_bak: 3,
    only_excel: 4,
  };

  items.sort((a, b) => {
    const pDiff = statusPriority[a.status] - statusPriority[b.status];
    if (pDiff !== 0) return pDiff;
    return a.code.localeCompare(b.code);
  });

  const totalUnique = items.length;
  const matchedCount = items.filter((i) => i.status === 'matched').length;
  const discrepancyCount = items.filter((i) => i.status === 'discrepancy').length;
  const onlyBakCount = items.filter((i) => i.status === 'only_bak').length;
  const onlyExcelCount = items.filter((i) => i.status === 'only_excel').length;
  const reconciliationRate =
    totalUnique > 0 ? Math.round((matchedCount / totalUnique) * 1000) / 10 : 0;

  return {
    totalUnique,
    matchedCount,
    discrepancyCount,
    onlyBakCount,
    onlyExcelCount,
    reconciliationRate,
    items,
  };
}

/**
 * Generates CSV content with UTF-8 BOM for equipment reconciliation results (.bak vs Excel)
 */
export function generateReconciliationCsv(result: ReconciliationResult): string {
  const headers = [
    'ลำดับ',
    'รหัสครุภัณฑ์ (จับคู่)',
    'รหัสใน .bak',
    'รหัสใน Excel',
    'ชื่อครุภัณฑ์',
    'ประเภท',
    'สถานะการตรวจกระทบยอด',
    'ข้อแตกต่างที่พบ',
    'ปีงบ (.bak)',
    'ปีงบ (Excel)',
    'สถานะ (.bak)',
    'สถานะ (Excel)',
    'ที่ตั้ง (.bak)',
    'ที่ตั้ง (Excel)',
    'S/N (.bak)',
    'S/N (Excel)',
  ];

  const statusLabels: Record<ReconciliationStatus, string> = {
    matched: 'ตรงกันทั้ง 2 แหล่ง 🟢',
    discrepancy: 'ข้อมูลขัดแย้ง 🟡',
    only_bak: 'มีเฉพาะใน .bak 🔵',
    only_excel: 'มีเฉพาะใน Excel 🟣',
  };

  const rows = result.items.map((item, idx) => {
    const diffText = item.discrepancies
      .map((d) => `${d.fieldLabel}: .bak[${d.bakValue}] vs Excel[${d.excelValue}]`)
      .join('; ');

    return [
      idx + 1,
      `"${item.normalizedCode}"`,
      `"${item.bakItem?.code || '-'}"`,
      `"${item.excelItem?.code || '-'}"`,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${item.type || '-'}"`,
      `"${statusLabels[item.status] || item.status}"`,
      `"${diffText.replace(/"/g, '""')}"`,
      `"${item.bakItem?.year || '-'}"`,
      `"${item.excelItem?.year || '-'}"`,
      `"${item.bakItem?.statusName || '-'}"`,
      `"${item.excelItem?.statusName || '-'}"`,
      `"${(item.bakItem?.deptName || '-').replace(/"/g, '""')}"`,
      `"${(item.excelItem?.deptName || '-').replace(/"/g, '""')}"`,
      `"${item.bakItem?.serial || '-'}"`,
      `"${item.excelItem?.serial || '-'}"`,
    ].join(',');
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}
