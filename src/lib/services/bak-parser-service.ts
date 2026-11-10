import {
  BakEquipmentItem,
  BakParseResult,
  BakSummary,
  BakTypeBreakdown,
  BakYearBreakdown,
  BakCategoryBreakdown,
  BakCrossTabEntry,
} from '@/types/bak-equipment';

const PAGE_SIZE = 8192;

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
 * Categorize equipment based on Thai government asset coding and equipment names
 */
export function classifyEquipment(
  code: string,
  rawName: string
): { type: string; category: string } {
  const c = code.trim();
  const n = rawName.toLowerCase();

  // 1. Computers & Laptops
  if (
    c.startsWith('7440.001') ||
    n.includes('think centre') ||
    n.includes('veriton') ||
    n.includes('optiplex') ||
    n.includes('acer m') ||
    n.includes('hp pro') ||
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
    n.includes('epson')
  ) {
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
 * Parse Microsoft SQL Server Tape Format (.bak) file containing equipment data
 */
export function parseBakBuffer(
  input: Uint8Array | ArrayBuffer | Buffer,
  fileName: string = 'database.bak'
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
        });
      }
    }
  }

  const items = Array.from(uniqueMap.values());

  // Aggregate: By Type
  const typeMap = new Map<string, { category: string; count: number; totalValue: number }>();
  // Aggregate: By Year
  const yearMap = new Map<string, { count: number; totalValue: number }>();
  // Aggregate: By Category
  const catMap = new Map<string, { count: number; totalValue: number }>();
  // Aggregate: Cross-Tab (Year x Type)
  const crossTabMap = new Map<string, { total: number; byType: Record<string, number> }>();

  let grandTotalValue = 0;

  for (const item of items) {
    grandTotalValue += item.price;

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

    // Cross-tab
    const ctEntry = crossTabMap.get(item.year) || { total: 0, byType: {} };
    ctEntry.total += 1;
    ctEntry.byType[item.type] = (ctEntry.byType[item.type] || 0) + 1;
    crossTabMap.set(item.year, ctEntry);
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

  // Numeric years for span calculation
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
  };

  return {
    fileName,
    fileSize: bytes.length,
    totalPagesScanned: totalPages,
    equipmentDataPages: dataPagesCount,
    items,
    summary,
    byType,
    byYear,
    byCategory,
    crossTab,
    availableTypes: byType.map((t) => t.type),
    availableYears: byYear.map((y) => y.year),
    availableCategories: byCategory.map((c) => c.category),
  };
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
    'หน่วยงาน/แผนกที่ครอบครอง',
    'หมายเลขเครื่อง/Serial',
    'ราคาต่อหน่วย (บาท)',
    'หน่วยนับ',
    'เลขที่เอกสารจัดซื้อ',
    'หมายเหตุ',
  ];

  const rows = items.map((item, idx) => {
    return [
      idx + 1,
      `"${(item.code || '').replace(/"/g, '""')}"`,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${(item.type || '').replace(/"/g, '""')}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(item.year || '').replace(/"/g, '""')}"`,
      `"${(item.deptName || '').replace(/"/g, '""')}"`,
      `"${(item.serial || '').replace(/"/g, '""')}"`,
      item.price.toFixed(2),
      `"${(item.unit || 'เครื่อง').replace(/"/g, '""')}"`,
      `"${(item.docNo || '').replace(/"/g, '""')}"`,
      `"${(item.remark || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  // UTF-8 BOM \uFEFF ensures Excel displays Thai characters properly without mojibake
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}
