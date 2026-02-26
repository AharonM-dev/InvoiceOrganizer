import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
@Injectable({
  providedIn: 'root',
})
export class ExportService {
  /**
   * ייצוא נתונים לקובץ אקסל (גליון יחיד)
   */
  async exportToExcel(data: any[], filename: string = 'export') {
    // 1. יצירת Workbook (חוברת עבודה)
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    // 2. הוספת נתונים לגליון

    this.addJsonDataToSheet(worksheet, data);
    // 3. כתיבה ל-Buffer ושמירה
    const buffer = await workbook.xlsx.writeBuffer(); //Buffer === משתנה שמכיל את כל הנתונים של הקובץ בפורמט בינארי. 
    this.saveAsExcelFile(buffer, filename, `xlsx`);
  }
  /**
   * ייצוא נתונים לקובץ CSV
   */
  async exportToCSV(data: any[], filename: string = 'export') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    this.addJsonDataToSheet(worksheet, data);
    // כתיבת CSV דורשת גישה קצת שונה, אבל exceljs מטפל בזה
    const buffer = await workbook.csv.writeBuffer();

    // שמירה כ-Blob של טקסט CSV
    const blob = new Blob([buffer], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
  }
    /**
   * ייצוא נתונים מרובה גליונות
   */
  async exportMultiSheetExcel(sheets: { name: string; data: any[] }[], filename: string) {
    const workbook = new ExcelJS.Workbook();

    sheets.forEach((sheet) => {
      // יצירת גליון עבור כל פריט במערך
      const worksheet = workbook.addWorksheet(sheet.name);
      this.addJsonDataToSheet(worksheet, sheet.data);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    this.saveAsExcelFile(buffer, filename, 'xlsx');
  }
  
  // --- פונקציות עזר פרטיות ---

  /**
   * פונקציה שממירה JSON לשורות ועמודות בגליון
   * (מחליף את XLSX.utils.json_to_sheet)
   */
  private addJsonDataToSheet(worksheet: ExcelJS.Worksheet, data: any[]) {
    if (data && data.length > 0) {
      // לקיחת המפתחות מהאובייקט הראשון כדי ליצור כותרות
      const keys = Object.keys(data[0]);
      
      // הגדרת העמודות (Header) - רוחב 20 הוא ברירת מחדל נוחה
      worksheet.columns = keys.map(key => ({ 
        header: key, 
        key: key, 
        width: 20 
      }));

      // הוספת השורות
      worksheet.addRows(data);
    }
  }

  /**
   * שמירת הקובץ בדפדפן
   */
  private saveAsExcelFile(buffer: any, fileName: string, extension: string) {
    const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    
    const data = new Blob([buffer], { type: EXCEL_TYPE });
    
    // בדיקה אם השם כבר כולל סיומת, אם לא - נוסיף
    const fullFileName = fileName.endsWith(`.${extension}`) ? fileName : `${fileName}.${extension}`;
    
    saveAs(data, fullFileName);
  }
}

