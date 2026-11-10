import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseBakBuffer, generateBakCsvReport } from '../src/lib/services/bak-parser-service';

describe('BakParserService: Microsoft SQL Server .bak Equipment Extraction', () => {
  const sampleFilePath = '/Users/superman/Desktop/DFDEquipment-20261109.bak';

  it('correctly parses the .bak file and extracts equipment records', () => {
    if (!fs.existsSync(sampleFilePath)) {
      console.warn('Sample .bak file not found on desktop, skipping live file test');
      return;
    }

    const buffer = fs.readFileSync(sampleFilePath);
    const result = parseBakBuffer(buffer, 'DFDEquipment-20261109.bak');

    expect(result).toBeDefined();
    expect(result.fileName).toBe('DFDEquipment-20261109.bak');
    expect(result.fileSize).toBe(buffer.length);
    expect(result.totalPagesScanned).toBeGreaterThan(1000);
    expect(result.items.length).toBe(402);

    // Summary checks
    expect(result.summary.totalCount).toBe(402);
    expect(result.summary.totalValue).toBeGreaterThan(0);
    expect(result.summary.uniqueTypesCount).toBeGreaterThanOrEqual(5);
    expect(result.summary.uniqueCategoriesCount).toBeGreaterThanOrEqual(3);

    // Breakdown by type checks
    expect(result.byType.length).toBeGreaterThan(0);
    const pcType = result.byType.find((t) => t.type.includes('คอมพิวเตอร์ (PC'));
    expect(pcType).toBeDefined();
    expect(pcType?.count).toBeGreaterThan(100);

    const printerType = result.byType.find((t) => t.type.includes('เครื่องพิมพ์'));
    expect(printerType).toBeDefined();
    expect(printerType?.count).toBeGreaterThan(50);

    // Breakdown by year checks
    expect(result.byYear.length).toBeGreaterThan(10);
    const year2556 = result.byYear.find((y) => y.year === '2556');
    expect(year2556).toBeDefined();
    expect(year2556?.count).toBe(55);

    // Cross-tabulation checks
    expect(result.crossTab.length).toBeGreaterThan(10);
    const ct2556 = result.crossTab.find((c) => c.year === '2556');
    expect(ct2556).toBeDefined();
    expect(ct2556?.total).toBe(55);

    // Item fields check
    const sampleItem = result.items[0];
    expect(sampleItem.id).toBeGreaterThan(0);
    expect(sampleItem.code).toBeTruthy();
    expect(sampleItem.name).toBeTruthy();
    expect(sampleItem.type).toBeTruthy();
    expect(sampleItem.category).toBeTruthy();
  });

  it('generates a valid CSV with UTF-8 BOM containing Thai text', () => {
    if (!fs.existsSync(sampleFilePath)) return;

    const buffer = fs.readFileSync(sampleFilePath);
    const result = parseBakBuffer(buffer, 'DFDEquipment-20261109.bak');
    const csv = generateBakCsvReport(result.items);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('รหัสครุภัณฑ์');
    expect(csv).toContain('ชื่อครุภัณฑ์');
    expect(csv).toContain('ประเภท');
    expect(csv).toContain('ปีงบประมาณ');
    expect(csv).toContain('คอมพิวเตอร์');

    // Also persist sample json for fast Vercel / offline access
    const outDir = path.join(__dirname, '../src/lib/data');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(outDir, 'sample-bak-data.json'),
      JSON.stringify(result, null, 2),
      'utf-8'
    );
  });
});
