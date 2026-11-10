export type AgeBracket = '1-7' | '7-14' | '14+' | 'unknown';

export interface BakEquipmentItem {
  id: number;
  code: string;
  name: string;
  serial: string;
  year: string;
  docNo: string;
  remark: string;
  deptName: string;
  unit: string;
  price: number;
  statusId: number;
  statusName?: string; // 'ใช้งานปกติ' | 'ส่งซ่อม' | 'ส่งคืน'
  procurementId?: number; // 1 (ทสอ.ฯ) | 2 (กง.กห.) | 3 (สม.)
  procurementName?: string; // 'ทสอ.ฯ' | 'กง.กห.' | 'สม.'
  deptId: number;
  type: string;
  category: string;
  // Lifecycle & Age analysis
  ageYears: number; // e.g. 10 (2569 - 2559)
  ageBracket: AgeBracket; // '1-7' | '7-14' | '14+' | 'unknown'
  ageStatusLabel: string; // 'ใช้งานปกติ' | 'เริ่มเสื่อมสภาพ' | 'เกินเกณฑ์/รอจำหน่าย'
  sourceFile?: string; // e.g. 'คอมพิวเตอร์ ๑.xls' or 'DFDEquipment-20261109.bak'
  sourceType: 'bak' | 'excel';
}

export interface BakAgeBreakdown {
  bracket: AgeBracket;
  label: string;
  count: number;
  totalValue: number;
  percent: number;
  color: 'emerald' | 'amber' | 'red' | 'slate';
}

export interface BakSummary {
  totalCount: number;
  totalValue: number;
  uniqueTypesCount: number;
  uniqueCategoriesCount: number;
  yearSpan: string;
  yearMin: string;
  yearMax: string;
  // Age Breakdown Summary
  age1To7Count: number;
  age1To7Value: number;
  age7To14Count: number;
  age7To14Value: number;
  age14PlusCount: number;
  age14PlusValue: number;
  unknownAgeCount: number;
}

export interface BakTypeBreakdown {
  type: string;
  category: string;
  count: number;
  totalValue: number;
  percent: number;
}

export interface BakYearBreakdown {
  year: string;
  count: number;
  totalValue: number;
  percent: number;
}

export interface BakCategoryBreakdown {
  category: string;
  count: number;
  totalValue: number;
  percent: number;
}

export interface BakCrossTabEntry {
  year: string;
  total: number;
  byType: Record<string, number>;
}

export interface BakCrossTabAgeEntry {
  type: string;
  category: string;
  total: number;
  age1To7: number;
  age7To14: number;
  age14Plus: number;
  unknownAge: number;
}

export interface BakParseResult {
  fileName: string;
  fileSize: number;
  totalPagesScanned: number;
  equipmentDataPages: number;
  sourceType: 'bak' | 'excel';
  sourceFilesCount?: number;
  sourceFileNames?: string[];
  items: BakEquipmentItem[];
  summary: BakSummary;
  byType: BakTypeBreakdown[];
  byYear: BakYearBreakdown[];
  byCategory: BakCategoryBreakdown[];
  byAge: BakAgeBreakdown[];
  crossTab: BakCrossTabEntry[];
  crossTabAge: BakCrossTabAgeEntry[];
  availableTypes: string[];
  availableYears: string[];
  availableCategories: string[];
  availableFiles?: string[];
  availableStatuses?: string[];
  availableProcurements?: string[];
}
