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
  deptId: number;
  type: string;
  category: string;
}

export interface BakSummary {
  totalCount: number;
  totalValue: number;
  uniqueTypesCount: number;
  uniqueCategoriesCount: number;
  yearSpan: string;
  yearMin: string;
  yearMax: string;
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

export interface BakParseResult {
  fileName: string;
  fileSize: number;
  totalPagesScanned: number;
  equipmentDataPages: number;
  items: BakEquipmentItem[];
  summary: BakSummary;
  byType: BakTypeBreakdown[];
  byYear: BakYearBreakdown[];
  byCategory: BakCategoryBreakdown[];
  crossTab: BakCrossTabEntry[];
  availableTypes: string[];
  availableYears: string[];
  availableCategories: string[];
}
