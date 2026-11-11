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
  division?: string; // กอง เช่น 'กบน. ฯ', 'กคจ. ฯ', 'กลาง. ฯ', 'ส่งคืน กลาง.กง.กห. รอจำหน่าย'
  unit: string;
  price: number;
  statusId: number;
  statusName?: string; // 'ใช้งานปกติ' | 'ปกติ' | 'ส่งซ่อม' | 'ส่งคืน'
  procurementId?: number; // 1 (ทสอ.ฯ) | 2 (กง.กห.) | 3 (สม.)
  procurementName?: string; // 'ทสอ.ฯ' | 'ทสอ.' | 'กง.กห.' | 'สม.'
  deptId: number;
  osId?: number;
  osName?: string; // 'Windows 10' | 'Windows 7' | 'Windows XP' | etc.
  projectId?: number;
  projectName?: string; // 'เบี้ยหวัด/บำเหน็จบำนาญ' | 'ระบบเงินเดือน' | 'บัญชี' | etc.
  cpu?: string;
  ram?: string;
  type: string;
  category: string;
  // Lifecycle & Age analysis
  ageYears: number; // e.g. 10 (2569 - 2559)
  ageBracket: AgeBracket; // '1-7' | '7-14' | '14+' | 'unknown'
  ageStatusLabel: string; // 'ปกติ' | 'เริ่มเสื่อมสภาพ' | 'เกินเกณฑ์/รอจำหน่าย'
  sourceFile?: string; // e.g. 'คอมพิวเตอร์ ๑.xls' or 'DFDEquipment-20261109.bak'
  sourceType: 'bak' | 'excel';
}

// Reconciliation / Audit Types (.bak vs Excel)
export type ReconciliationStatus = 'matched' | 'discrepancy' | 'only_bak' | 'only_excel';

export interface ReconciliationDiscrepancy {
  field: string;
  fieldLabel: string;
  bakValue: string;
  excelValue: string;
}

export interface ReconciliationItem {
  id: string;
  normalizedCode: string;
  code: string;
  name: string;
  type: string;
  category: string;
  status: ReconciliationStatus;
  discrepancies: ReconciliationDiscrepancy[];
  bakItem?: BakEquipmentItem;
  excelItem?: BakEquipmentItem;
}

export interface ReconciliationResult {
  totalUnique: number;
  matchedCount: number;
  discrepancyCount: number;
  onlyBakCount: number;
  onlyExcelCount: number;
  reconciliationRate: number; // e.g. 85.5 (%)
  items: ReconciliationItem[];
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
