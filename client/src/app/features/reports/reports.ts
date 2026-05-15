import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// PrimeNG Imports
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import * as ExcelJS from 'exceljs';
import * as FileSaver from 'file-saver';
import { TopBarComponent } from '../../layout/top-bar/top-bar';
import { cssVar, cssVarWithAlpha } from '../../core/theme/theme-tokens';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { InvoiceListDto, CategorySummaryDto } from '../../core/models/invoice.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ChartModule,
    ButtonModule,
    DatePickerModule,
    TopBarComponent,
  ],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class Reports implements OnInit {
  private http = inject(HttpClient);
  private cd = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

   // KPI Data
  totalSpend = 0;
  monthlyAverage = 0;
  topCategory = '-';
  savings = 0;
  monthlyBudget = 0;
  
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

  /* Segment control state — drives the granularity of the trend chart.
     Changing it reloads the trend chart from the matching summary endpoint. */
  range: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly';
  setRange(v: 'daily' | 'weekly' | 'monthly' | 'yearly') {
    this.range = v;
    this.loadTrendChart();
  }

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
    const fallback = cssVar('--wf-border', '#26262c');
    return labels.map((name: string, i: number) => ({
      name,
      value: data[i] ?? 0,
      color: colors[i] ?? fallback,
    }));
  }
  
  /* Dynamic trend chart header — reflects the active grain and date window. */
  get trendTitle(): string {
    const grainLabel: Record<string, string> = { daily: 'יומי', weekly: 'שבועי', monthly: 'חודשי', yearly: 'שנתי' };
    if (this.dateRange?.[0] && this.dateRange?.[1]) {
      const fmt = (d: Date) => d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return `מגמת הוצאות — ${fmt(this.dateRange[0])} עד ${fmt(this.dateRange[1])}`;
    }
    return `מגמת הוצאות — תצוגה ${grainLabel[this.range]}`;
  }

  get trendSubtitle(): string {
    const defaultWindows: Record<string, string> = {
      daily:   '30 הימים האחרונים',
      weekly:  '12 השבועות האחרונים',
      monthly: '6 החודשים האחרונים',
      yearly:  '5 השנים האחרונות',
    };
    if (this.dateRange?.[0] && this.dateRange?.[1]) {
      return 'סך ההוצאות לפי טווח התאריכים שנבחר';
    }
    return `סך ההוצאות ב${defaultWindows[this.range]}`;
  }

  ngOnInit() {
    this.initCharts();
    this.fetchData();
    this.loadTrendChart();
  }

  /* Refetch everything when the date-range picker changes. PrimeNG range mode
     emits [start, null] after the first pick — act only when both ends are set. */
  onDateRangeChange() {
    const start = this.dateRange?.[0];
    const end = this.dateRange?.[1];
    if (start instanceof Date && end instanceof Date) {
      this.fetchData();
      this.loadTrendChart();
    }
  }

  /* Explicit clear — resets the filter and reloads all-time data. */
  clearDateRange() {
    this.dateRange = undefined;
    this.fetchData();
    this.loadTrendChart();
  }

  fetchData() {
    const dateQuery = this.buildDateRangeQuery();

    // A filter-active result returning 0 invoices means "no invoices in that range",
    // not "user has no invoices at all" — only update hasData from unfiltered results.
    const isFiltered = !!(this.dateRange?.[0] && this.dateRange?.[1]);

    forkJoin({
        invoices: this.http.get<InvoiceListDto[]>(`${environment.apiUrl}/Invoices${dateQuery.invoices}`),
        categorySummary: this.http.get<CategorySummaryDto[]>(`${environment.apiUrl}/Invoices/summary/by-category${dateQuery.category}`),
        profile: this.authService.getProfile()
    }).subscribe({
        next: (response) => {
            this.monthlyBudget = response.profile?.budget ?? 0;

            if (!isFiltered) {
                this.hasData = !!(response.invoices && response.invoices.length > 0);
            }

            if (this.hasData) {
                this.processKPIs(response.invoices ?? [], response.categorySummary ?? []);
                this.updateCategoryChart(response.categorySummary ?? []);
                this.updateTopVendorsChart(response.invoices ?? []);
            }

            this.cd.detectChanges();
        },
        error: (err) => {
            console.error("Error loading report data", err);
            if (!isFiltered) {
                this.hasData = false;
            }
            this.cd.detectChanges();
        }
    });
  }

  /* Build query strings that scope the invoice list + category summary to the
     selected date range. /api/Invoices uses an inclusive toDate; by-category
     uses an exclusive upper bound, so the end date is shifted +1 day there. */
  private buildDateRangeQuery(): { invoices: string; category: string } {
    if (this.dateRange?.[0] && this.dateRange?.[1]) {
      const from = this.formatDateLocal(this.dateRange[0]);
      const toInclusive = this.formatDateLocal(this.dateRange[1]);
      const toExclusive = this.formatDateLocal(this.addDays(this.dateRange[1], 1));
      return {
        invoices: `?fromDate=${from}&toDate=${toInclusive}`,
        category: `?from=${from}&to=${toExclusive}`,
      };
    }
    return { invoices: '', category: '' };
  }

  /* The window the trend chart covers: the picked date range if set,
     otherwise a sensible trailing window per the selected granularity. */
  private getTrendWindow(): { from: Date; to: Date } {
    if (this.dateRange?.[0] && this.dateRange?.[1]) {
      return { from: this.dateRange[0], to: this.dateRange[1] };
    }
    const today = new Date();
    let from: Date;
    switch (this.range) {
      case 'daily':   from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29); break;
      case 'weekly':  from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7 * 11); break;
      case 'monthly': from = new Date(today.getFullYear(), today.getMonth() - 5, 1); break;
      case 'yearly':  from = new Date(today.getFullYear() - 4, 0, 1); break;
    }
    return { from: from!, to: today };
  }

  /* Load the trend chart from the summary endpoint matching the selected
     granularity, scoped to the active window. */
  loadTrendChart() {
    const { from, to } = this.getTrendWindow();
    const fromStr = this.formatDateLocal(from);
    const toStr = this.formatDateLocal(this.addDays(to, 1)); // inclusive end → exclusive bound

    const base = `${environment.apiUrl}/Invoices/summary`;
    let url: string;
    switch (this.range) {
      case 'daily':   url = `${base}/by-day?from=${fromStr}&to=${toStr}`; break;
      case 'weekly':  url = `${base}/by-week?from=${fromStr}&to=${toStr}`; break;
      case 'monthly': url = `${base}/by-month?from=${fromStr}&to=${toStr}`; break;
      case 'yearly':  url = `${base}/by-year?from=${fromStr}&to=${toStr}`; break;
    }

    this.http.get<any[]>(url!).subscribe({
      next: (rows) => {
        this.applyTrendData(rows ?? []);
        this.cd.detectChanges();
      },
      error: (err) => console.error("Error loading trend data", err)
    });
  }

  /* Map a summary-endpoint response onto the trend chart. The bucket sequence
     is generated client-side from the window so gaps with no invoices still
     render as zero rather than collapsing the axis. */
  private applyTrendData(rows: any[]) {
    const { from, to } = this.getTrendWindow();
    const labels: string[] = [];
    const data: number[] = [];

    if (this.range === 'daily') {
      const map = new Map<string, number>();
      rows.forEach(r => map.set(r.date, r.total || 0));
      let d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      const last = new Date(to.getFullYear(), to.getMonth(), to.getDate());
      while (d <= last) {
        labels.push(d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }));
        data.push(map.get(this.formatDateLocal(d)) || 0);
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      }
    } else if (this.range === 'weekly') {
      const map = new Map<string, number>();
      rows.forEach(r => map.set(r.weekStart, r.total || 0));
      let d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()); // back to Sunday
      const last = new Date(to.getFullYear(), to.getMonth(), to.getDate());
      while (d <= last) {
        labels.push(d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }));
        data.push(map.get(this.formatDateLocal(d)) || 0);
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
      }
    } else if (this.range === 'monthly') {
      const map = new Map<string, number>();
      rows.forEach(r => map.set(`${r.year}-${r.month}`, r.total || 0));
      let d = new Date(from.getFullYear(), from.getMonth(), 1);
      const last = new Date(to.getFullYear(), to.getMonth(), 1);
      while (d <= last) {
        labels.push(d.toLocaleString('he-IL', { month: 'long', year: 'numeric' }));
        data.push(map.get(`${d.getFullYear()}-${d.getMonth() + 1}`) || 0);
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }
    } else { // yearly
      const map = new Map<number, number>();
      rows.forEach(r => map.set(r.year, r.total || 0));
      for (let y = from.getFullYear(); y <= to.getFullYear(); y++) {
        labels.push(String(y));
        data.push(map.get(y) || 0);
      }
    }

    this.monthlyTrendData = {
      ...this.monthlyTrendData,
      labels,
      datasets: [{
        ...this.monthlyTrendData.datasets[0],
        data
      }]
    };
  }

  private formatDateLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private addDays(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  processKPIs(invoices: InvoiceListDto[], categories: CategorySummaryDto[]) {
      // 1. Total Spend
      this.totalSpend = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      // 2. Monthly Average — based on unique months with data
      const uniqueMonthsSet = new Set(invoices.map(inv => {
          const d = this.parseDateOnlyLocal(inv.invoiceDate);
          return d.getMonth() + '-' + d.getFullYear();
      }));
      const uniqueMonths = uniqueMonthsSet.size;
      this.monthlyAverage = uniqueMonths > 0 ? Math.round(this.totalSpend / uniqueMonths) : 0;

      // 3. Top Category
      if (categories && categories.length > 0) {
          const top = categories.reduce((prev, current) => (prev.total > current.total) ? prev : current);
          this.topCategory = top.categoryName || 'Unknown';
      }

      // 4. Budget balance: totalBudgetForPeriod - totalSpend
      let monthsCount: number;
      if (this.dateRange?.[0] && this.dateRange?.[1]) {
          const start = this.dateRange[0];
          const end = this.dateRange[1];
          const diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
          monthsCount = diff > 0 ? diff : 0;
      } else {
          monthsCount = uniqueMonths;
      }
      if (this.monthlyBudget > 0 && monthsCount > 0) {
          this.savings = this.monthlyBudget * monthsCount - this.totalSpend;
      } else {
          this.savings = 0;
      }
  }

  /* Parse a backend DateOnly string ("YYYY-MM-DD") as a LOCAL date.
     new Date("YYYY-MM-DD") parses as UTC midnight, which shifts a day/month
     in negative-offset timezones and mis-buckets invoices. */
  private parseDateOnlyLocal(dateOnly: string): Date {
      const [year, month, day] = dateOnly.split('-').map(Number);
      return new Date(year, month - 1, day);
  }

  updateCategoryChart(categories: CategorySummaryDto[]) {
      let labels = [];
      let data = [];
      let bgColors = [];

      const palette = [
        cssVar('--wf-accent', '#c8a76d'),
        cssVar('--wf-text-secondary', '#b8b8bf'),
        cssVar('--wf-success', '#6fa890'),
        cssVar('--wf-warn', '#c89860'),
        cssVar('--wf-danger', '#c47878'),
        cssVar('--wf-text-muted', '#72727a'),
      ];
      if (!categories || categories.length === 0) {
          labels = ['אין הוצאות מקוטלגות'];
          data = [1];
          bgColors = [cssVar('--wf-border', '#26262c')]; // border tone, themed
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

  updateTopVendorsChart(invoices: InvoiceListDto[]) {
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
    // Read live theme tokens — values come from CSS variables on
    // document.documentElement, so charts respect dark or light theme.
    const accent       = cssVar('--wf-accent', '#c8a76d');
    const accentDim    = cssVarWithAlpha('--wf-accent', 0.18, '#c8a76d');
    const accentClear  = cssVarWithAlpha('--wf-accent', 0, '#c8a76d');
    const text         = cssVar('--wf-text', '#ececef');
    const textMuted    = cssVar('--wf-text-muted', '#72727a');
    const textSec      = cssVar('--wf-text-secondary', '#b8b8bf');
    const border       = cssVarWithAlpha('--wf-border', 0.6, '#26262c');
    const borderSolid  = cssVar('--wf-border', '#26262c');
    const surface      = cssVar('--wf-surface', '#131316');
    const donutPalette = [
      cssVar('--wf-accent', '#c8a76d'),
      cssVar('--wf-text-secondary', '#b8b8bf'),
      cssVar('--wf-success', '#6fa890'),
      cssVar('--wf-warn', '#c89860'),
      cssVar('--wf-danger', '#c47878'),
      cssVar('--wf-text-muted', '#72727a'),
    ];

    // 1. Monthly Trends (Line Chart) — seeded empty; real data fills it in fetchData()
    this.monthlyTrendData = {
      labels: [],
      datasets: [
        {
          label: 'הוצאות',
          data: [],
          fill: true,
          borderColor: accent,
          tension: 0.4,
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, accentDim);
            gradient.addColorStop(1, accentClear);
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
            borderColor: borderSolid,
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

    // 2. Category Distribution (Doughnut Chart) — seeded empty; real data fills it in fetchData()
    this.categoryData = {
      labels: [],
      datasets: [
        {
          data: [],
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

    // 3. Top Vendors (Horizontal Bar Chart) — seeded empty; real data fills it in fetchData()
    this.topVendorsData = {
      labels: [],
      datasets: [
        {
          label: 'הוצאה חודשית',
          data: [],
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
                borderColor: borderSolid,
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
}
