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

  // 1. Computers & Laptops
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
    if (n.includes('แม่ข่าย') || n.includes('server')) {
      return {
        type: 'คอมพิวเตอร์แม่ข่าย (Server)',
        category: 'ครุภัณฑ์คอมพิวเตอร์',
      };
    }
    return {
      type: 'คอมพิวเตอร์ (PC / All-in-one)',
      category: 'ครุภัณฑ์คอมพิวเตอร์',
    };
  }

  // 2. Notebooks & Laptops
  if (
    c.startsWith('7440.002') ||
    n.includes('โน้ตบุ๊ก') ||
    n.includes('โน๊ตบุ๊ค') ||
    n.includes('notebook') ||
    n.includes('laptop') ||
    n.includes('asus g')
  ) {
    return {
      type: 'คอมพิวเตอร์พกพา (Notebook)',
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
  };
}

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

  const uniqueMap = new Map<number, BakEquipmentItem>();
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

      // Fixed length portion size
      const fixedLen = readUInt16LE(bytes, recOffset + 2);
      if (fixedLen !== 85) continue;

      // Column count
      const numCols = readUInt16LE(bytes, recOffset + fixedLen);
      if (numCols !== 31) continue;

      // Null bitmap length
      const nullBytes = Math.ceil(31 / 8);
      const varOff = recOffset + fixedLen + 2 + nullBytes;
      const numVar = readUInt16LE(bytes, varOff);
      if (numVar !== 14) continue;

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
      const statusId = readInt32LE(bytes, recOffset + 24);
      const deptId = readInt32LE(bytes, recOffset + 28);

      const code = (varVals[0] || '').trim();
      const name = (varVals[1] || '').trim();
      const serial = (varVals[2] || '').trim();
      let year = (varVals[3] || '').trim();
      if (!year || year === '0') year = 'ไม่ระบุปี';

      const docNo = (varVals[4] || '').trim();
      const remark = (varVals[7] || '').trim();
      const deptName = (varVals[8] || '').trim();
      const unit = (varVals[12] || '').trim() || 'เครื่อง';

      if (!uniqueMap.has(eqId)) {
        const { type, category } = classifyEquipment(code, name);
        const { ageYears, ageBracket, ageStatusLabel } = calculateEquipmentAge(year, currentYear);

        uniqueMap.set(eqId, {
          id: eqId,
          code,
          name,
          serial,
          year,
          docNo,
          remark,
          deptName,
          unit,
          price,
          statusId,
          deptId,
          type,
          category,
          ageYears,
          ageBracket,
          ageStatusLabel,
          sourceFile: fileName,
          sourceType: 'bak',
        });
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
    'ประเภท',
    'หมวดหมู่',
    'ปีงบประมาณ',
    'อายุใช้งาน (ปี)',
    'สถานะอายุ',
    'หน่วยงาน/แผนกที่ครอบครอง',
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
      `"${(item.type || '').replace(/"/g, '""')}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(item.year || '').replace(/"/g, '""')}"`,
      item.ageYears > 0 ? item.ageYears : '-',
      `"${item.ageStatusLabel}"`,
      `"${(item.deptName || '').replace(/"/g, '""')}"`,
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
