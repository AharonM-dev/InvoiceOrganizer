import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// PrimeNG Imports
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import * as ExcelJS from 'exceljs';
import * as FileSaver from 'file-saver';
import { TopBarComponent } from '../../layout/top-bar/top-bar';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ChartModule,
    CardModule,
    ButtonModule,
    DatePickerModule,
    TableModule,
    TopBarComponent,
  ],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class Reports implements OnInit {
  private http = inject(HttpClient);
  private cd = inject(ChangeDetectorRef);
   // KPI Data
  totalSpend = 0;
  monthlyAverage = 0;
  topCategory = '-';
  savings = 0; // נשאיר כרגע סטטי או נחשב אם יש נתוני תקציב
  
  hasData = false; // Add flag to track if user has any invoices

  // Chart Data
  monthlyTrendData: any;
  monthlyTrendOptions: any;

  categoryData: any;
  categoryOptions: any;

  topVendorsData: any;
  topVendorsOptions: any;

  // Filters
  dateRange: Date[] | undefined;

  /* Segment control state — UI-only placeholder per the design plan.
     Changing this does NOT refire data aggregation; it just toggles the
     active pill in the segmented control matching the wireframe. */
  range: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly';
  setRange(v: 'daily' | 'weekly' | 'monthly' | 'yearly') { this.range = v; }

  /* Derived top-5 vendors list for the bar-list legend below the chart. */
  get topVendorsList(): Array<{ name: string; value: number; pct: number }> {
    const labels = this.topVendorsData?.labels ?? [];
    const data = this.topVendorsData?.datasets?.[0]?.data ?? [];
    const max = data.length ? Math.max(...data) : 1;
    return labels.map((name: string, i: number) => ({
      name,
      value: data[i] ?? 0,
      pct: max > 0 ? Math.round((data[i] / max) * 100) : 0,
    }));
  }

  /* Derived donut legend rows for the side panel. */
  get categoryLegend(): Array<{ name: string; value: number; color: string }> {
    const labels = this.categoryData?.labels ?? [];
    const data = this.categoryData?.datasets?.[0]?.data ?? [];
    const colors = this.categoryData?.datasets?.[0]?.backgroundColor ?? [];
    return labels.map((name: string, i: number) => ({
      name,
      value: data[i] ?? 0,
      color: colors[i] ?? '#26262c',
    }));
  }
  
  ngOnInit() {
    this.initCharts();
    this.fetchData();
  }
  
  fetchData() {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
        console.error('No user found in localStorage');
        return;
    }
    const loggedUser = JSON.parse(userStr);
    const headers = { 'Authorization': `Bearer ${loggedUser.token}` };

    forkJoin({
        invoices: this.http.get<any[]>("http://localhost:5042/api/Invoices", { headers }),
        categorySummary: this.http.get<any[]>("http://localhost:5042/api/Invoices/summary/by-category", { headers })
    }).subscribe({
        next: (response) => {
            console.log('Reports Data:', response);
            
            if (response.invoices && response.invoices.length > 0) {
                this.hasData = true;
                this.processKPIs(response.invoices, response.categorySummary);
                this.updateMonthlyTrendChart(response.invoices);
                this.updateCategoryChart(response.categorySummary);
                this.updateTopVendorsChart(response.invoices);
            } else {
                this.hasData = false;
            }
            
            this.cd.detectChanges();
        },
        error: (err) => console.error("Error loading report data", err)
    });
  }

  processKPIs(invoices: any[], categories: any[]) {
      // 1. Total Spend
      this.totalSpend = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      // 2. Monthly Average (simple calc based on unique months found or just 12?)
      // נחשב ממוצע לפי מספר החודשים שיש בהם נתונים בפועל
      const uniqueMonths = new Set(invoices.map(inv => new Date(inv.invoiceDate).getMonth() + '-' + new Date(inv.invoiceDate).getFullYear())).size;
      this.monthlyAverage = uniqueMonths > 0 ? Math.round(this.totalSpend / uniqueMonths) : 0;

      // 3. Top Category
      if (categories && categories.length > 0) {
          const top = categories.reduce((prev, current) => (prev.total > current.total) ? prev : current);
          this.topCategory = top.categoryName || 'Unknown';
      }
      
      // 4. Savings (Placeholder logic: assume 20% savings target or just static for now)
      this.savings = Math.round(this.totalSpend * 0.1); 
  }

  updateMonthlyTrendChart(invoices: any[]) {
      const labels: string[] = [];
      const data: number[] = [];
      const today = new Date(); // תאריך נוכחי
  
      // יצירת תוויות ונתונים ל-6 החודשים האחרונים (כולל הנוכחי)
      for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          // שמות חודשים בעברית
          const monthName = d.toLocaleString('he-IL', { month: 'long' });
          labels.push(monthName);
  
          // סיכום חשבוניות לחודש זה
          const monthlyTotal = invoices.reduce((sum, inv) => {
              const invDate = new Date(inv.invoiceDate);
              if (invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear()) {
                  return sum + (inv.total || 0);
              }
              return sum;
          }, 0);
  
          data.push(monthlyTotal);
      }

      this.monthlyTrendData = {
          ...this.monthlyTrendData,
          labels: labels,
          datasets: [{
              ...this.monthlyTrendData.datasets[0],
              data: data
          }]
      };
  }

  updateCategoryChart(categories: any[]) {
      let labels = [];
      let data = [];
      let bgColors = [];

      const palette = ['#c8a76d', '#b8b8bf', '#6fa890', '#c89860', '#c47878', '#72727a'];
      if (!categories || categories.length === 0) {
          labels = ['אין הוצאות מקוטלגות'];
          data = [1];
          bgColors = ['#26262c']; // border tone for empty state
      } else {
          labels = categories.map(c => c.categoryName || 'אחר');
          data = categories.map(c => c.total || 0);
          bgColors = labels.map((_, i) => palette[i % palette.length]);
      }

      this.categoryData = {
          ...this.categoryData,
          labels: labels,
          datasets: [{
              ...this.categoryData.datasets[0],
              data: data,
              backgroundColor: bgColors
          }]
      };
  }

  updateTopVendorsChart(invoices: any[]) {
      // קיבוץ לפי ספק.
      // InvoiceListDto exposes supplierName (the real field). The previous
      // implementation read inv.vendorName / inv.supplier?.name which do not
      // exist on the list contract — every invoice fell into 'Unknown'.
      const vendorMap = new Map<string, number>();

      invoices.forEach(inv => {
          const vendorName = inv.supplierName || 'ללא ספק';
          const current = vendorMap.get(vendorName) || 0;
          vendorMap.set(vendorName, current + (inv.total || 0));
      });

      // המרה למערך ומיון
      const sortedVendors = Array.from(vendorMap.entries())
          .sort((a, b) => b[1] - a[1]) // יורד
          .slice(0, 5); // רק 5 הראשונים

      const labels = sortedVendors.map(v => v[0]);
      const data = sortedVendors.map(v => v[1]);

      this.topVendorsData = {
          ...this.topVendorsData,
          labels: labels,
          datasets: [{
              ...this.topVendorsData.datasets[0],
              data: data
          }]
      };
  }

  initCharts() {
    // Token palette: one warm accent + tonal grays + state hues
    const accent       = '#c8a76d';
    const accentDim    = 'rgba(200, 167, 109, 0.18)';
    const text         = '#ececef';
    const textMuted    = '#72727a';
    const textSec      = '#b8b8bf';
    const border       = 'rgba(38, 38, 44, 0.6)';
    const surface      = '#131316';
    const donutPalette = ['#c8a76d', '#b8b8bf', '#6fa890', '#c89860', '#c47878', '#72727a'];

    // 1. Monthly Trends (Line Chart)
    this.monthlyTrendData = {
      labels: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר'],
      datasets: [
        {
          label: 'הוצאות',
          data: [2200, 3100, 2800, 4500, 2400, 3800, 4100, 3600, 4520],
          fill: true,
          borderColor: accent,
          tension: 0.4,
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, accentDim);
            gradient.addColorStop(1, 'rgba(200, 167, 109, 0)');
            return gradient;
          },
          borderWidth: 2,
          pointBackgroundColor: accent,
          pointBorderColor: surface,
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6
        }
      ]
    };

    this.monthlyTrendOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.6,
      plugins: {
        legend: { display: false },
        tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: surface,
            titleColor: text,
            bodyColor: textSec,
            borderColor: '#26262c',
            borderWidth: 1,
            padding: 10,
            displayColors: false
        }
      },
      scales: {
        x: {
          ticks: { color: textMuted, font: { size: 11 } },
          grid:  { color: border, drawBorder: false, tickLength: 0 }
        },
        y: {
          ticks: {
            color: textMuted,
            callback: function(value: any) { return '₪' + value; },
            font: { size: 11 }
          },
          grid: { color: border, drawBorder: false, borderDash: [5, 5] }
        }
      },
      interaction: { mode: 'nearest', axis: 'x', intersect: false }
    };

    // 2. Category Distribution (Doughnut Chart)
    this.categoryData = {
      labels: ['מגורים', 'מזון', 'תחבורה', 'בילויים', 'שונות'],
      datasets: [
        {
          data: [1200, 800, 450, 300, 150],
          backgroundColor: donutPalette.slice(0, 5),
          borderColor: surface,
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    };

    this.categoryOptions = {
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { display: false }
      }
    };

    // 3. Top Vendors (Horizontal Bar Chart)
    this.topVendorsData = {
      labels: ['רמי לוי', 'חשמל', 'סלקום', 'דלק', 'אמזון'],
      datasets: [
        {
          label: 'הוצאה חודשית',
          data: [2500, 1800, 1200, 900, 600],
          backgroundColor: accent,
          borderRadius: 4,
          barThickness: 14
        }
      ]
    };

    this.topVendorsOptions = {
        indexAxis: 'y',
        maintainAspectRatio: false,
        aspectRatio: 0.8,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: surface,
                titleColor: text,
                bodyColor: textSec,
                borderColor: '#26262c',
                borderWidth: 1
            }
        },
        scales: {
            x: {
                ticks: { color: textMuted, font: { size: 11 } },
                grid:  { color: border, drawBorder: false }
            },
            y: {
                ticks: { color: textSec, font: { weight: '500' as any, size: 12 } },
                grid:  { display: false, drawBorder: false }
            }
        }
    };
  }

  exportToExcel() {
      // נבדוק האם יש לנו נתונים
      // בדו"חות אין לנו array "expenses" נגיש באותה קלות, אלא אם נמפה מתוך categoryData, 
      // אבל אפשר להשתמש במיפוי קטגוריות כדו"ח בסיסי עבור מסך הדוחות.
      if (!this.categoryData || !this.categoryData.labels) {
          alert('אין נתונים לייצוא');
          return;
      }
  
      const workbook = new ExcelJS.Workbook();
      
      // 1. גיליון קטגוריות
      const worksheetCat = workbook.addWorksheet('סיכום קטגוריות');
      worksheetCat.addRow(['קטגוריה', 'סכום כולל']);
      worksheetCat.getRow(1).font = { bold: true };
      
      this.categoryData.labels.forEach((label: string, index: number) => {
          worksheetCat.addRow([label, this.categoryData.datasets[0].data[index]]);
      });
      worksheetCat.columns.forEach(column => column.width = 20);

      // 2. גיליון ספקים
      if (this.topVendorsData && this.topVendorsData.labels) {
          const worksheetVend = workbook.addWorksheet('הספקים המובילים');
          worksheetVend.addRow(['ספק', 'הוצאה כוללת']);
          worksheetVend.getRow(1).font = { bold: true };
          
          this.topVendorsData.labels.forEach((label: string, index: number) => {
              worksheetVend.addRow([label, this.topVendorsData.datasets[0].data[index]]);
          });
          worksheetVend.columns.forEach(column => column.width = 20);
      }
  
      workbook.xlsx.writeBuffer().then((data) => {
          const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          FileSaver.saveAs(blob, `Reports_Summary_${new Date().getTime()}.xlsx`);
      });
  }

  exportToPDF() {
    console.log('Exporting to PDF...');
    // Implementation would use jspdf here
  }
}
