import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

export interface ParseResult<T> {
  data: T[];
  error?: string;
  success: boolean;
}

export function useExcelImport<T>(
  parseRow: (row: any) => T | null
) {
  const [isImporting, setIsImporting] = useState(false);

  const importFile = useCallback(async (file: File): Promise<ParseResult<T>> => {
    setIsImporting(true);
    try {
      if (file.name.endsWith('.csv') || file.type.includes('csv') || file.name.endsWith('.txt')) {
        // Handle CSV specifically for raw text based (like WA Group Links)
        const text = await file.text();
        const lines = text.split('\n');
        const parsedData: T[] = [];
        
        // For lines, we wrap them in an object to pass to parseRow
        for (const line of lines) {
          if (line.trim()) {
            const parsed = parseRow({ rawLine: line.trim() });
            if (parsed) parsedData.push(parsed);
          }
        }
        
        setIsImporting(false);
        return { data: parsedData, success: true };
      }

      // Handle Excel/XLSX
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

      const parsedData: T[] = [];
      jsonData.forEach((row) => {
        const parsed = parseRow(row);
        if (parsed) parsedData.push(parsed);
      });

      setIsImporting(false);
      return { data: parsedData, success: true };
    } catch (error: any) {
      setIsImporting(false);
      return { data: [], error: error.message || 'Gagal membaca file', success: false };
    }
  }, [parseRow]);

  return { importFile, isImporting };
}
