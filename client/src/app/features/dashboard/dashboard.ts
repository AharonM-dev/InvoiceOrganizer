import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { HttpClient } from '@angular/common/http';
import * as ExcelJS from 'exceljs';
import * as FileSaver from 'file-saver';
import { TopBarComponent } from '../../layout/top-bar/top-bar';
import { cssVar, cssVarWithAlpha } from '../../core/theme/theme-tokens';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    TableModule, ButtonModule, ChartModule,
    TagModule, AvatarModule, ProgressBarModule, TooltipModule, InputTextModule,
    TopBarComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {

  isLoading: boolean = true;

  expenses: Expense[] = [];
  expenseTrendChart: any;
  expenseTrendOptions: any;
  categoryChart: any;
  categoryOptions: any;
  /** Top-category label cached from the by-category summary endpoint —
   *  used in the KPI strip. Null while loading / no data. */
  topCategoryName: string | null = null;
  topCategoryTotal = 0;

  monthlyBudget = 0;

  private http = inject(HttpClient);
  private cd = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  /* ── KPI getters — derived only from the real list payload + the
        by-category summary. No invented statuses. ─────────────────────── */
  get totalAmount(): number {
    return this.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }
  get invoiceCount(): number {
    return this.expenses.length;
  }
  get averageAmount(): number {
    return this.invoiceCount > 0 ? this.totalAmount / this.invoiceCount : 0;
  }
  get supplierCount(): number {
    const seen = new Set<string>();
    for (const e of this.expenses) {
      const v = (e.vendor || '').trim();
      if (v) seen.add(v);
    }
    return seen.size;
  }

  ngOnInit() {
    this.loadDashboardData();
    this.initCharts();
  }

  loadDashboardData() {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      console.error('No user found in localStorage');
      return;
    }
    const loggedUser = JSON.parse(userStr);
    const headers = { 'Authorization': `Bearer ${loggedUser.token}` };

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const fromDate = this.formatLocalDate(sixMonthsAgo);

    // ביצוע שתי קריאות במקביל
    forkJoin({
      invoices: this.http.get<any[]>(`http://localhost:5042/api/Invoices?fromDate=${fromDate}`, { headers }),
      categorySummary: this.http.get<any[]>("http://localhost:5042/api/Invoices/summary/by-category", { headers }),
      profile: this.authService.getProfile()
    }).subscribe({
      next: (response) => {
        // 1. Map list items into a UI shape using ONLY fields the
        //    InvoiceListDto contract actually returns:
        //      id, invoiceNumber, invoiceDate, total, supplierName, filePath.
        this.expenses = (response.invoices ?? []).map(inv => ({
          id: inv.id,
          vendor: inv.supplierName ?? '',
          date: inv.invoiceDate,
          amount: inv.total,
        }));

        // 2. Set monthly budget before updating charts
        this.monthlyBudget = response.profile?.budget ?? 0;

        // 3. Process the category summary for the donut + top-category KPI
        this.processCategoryData(response.categorySummary);

        // 4. Update the trend line from the same invoices list
        this.updateTrendChart(response.invoices ?? []);

        this.isLoading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error("שגיאה בטעינת נתונים", err);
        this.isLoading = false;
        this.cd.detectChanges();
      }
    });
  }

  /* Wireframe palette — one brand color plus tonal grays/state hues. The
     hex values are read from CSS variables at chart-init time so the
     chart adopts whatever the active theme set on document.documentElement. */
  private get chartPalette(): string[] {
    return [
      cssVar('--wf-accent', '#c8a76d'),
      cssVar('--wf-text-secondary', '#b8b8bf'),
      cssVar('--wf-success', '#6fa890'),
      cssVar('--wf-warn', '#c89860'),
      cssVar('--wf-danger', '#c47878'),
      cssVar('--wf-text-muted', '#72727a'),
    ];
  }

  processCategoryData(summaryData: any[]) {
    let labels: string[] = [];
    let data: number[] = [];
    let bgColors: string[] = [];

    if (!summaryData || summaryData.length === 0) {
      labels = ['אין הוצאות מקוטלגות'];
      data = [1];
      bgColors = [cssVar('--wf-border', '#26262c')]; // border tone, themed
      this.topCategoryName = null;
      this.topCategoryTotal = 0;
    } else {
      // CategorySummaryDto: { categoryId, categoryName, count, total }
      labels = summaryData.map(x => x.categoryName ?? 'אחר');
      data = summaryData.map(x => Number(x.total) || 0);
      bgColors = labels.map((_, i) => this.chartPalette[i % this.chartPalette.length]);

      const top = summaryData.reduce(
        (a, b) => ((b.total ?? 0) > (a.total ?? 0) ? b : a),
        summaryData[0],
      );
      this.topCategoryName = top.categoryName ?? 'אחר';
      this.topCategoryTotal = Number(top.total) || 0;
    }

    this.categoryChart = {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: bgColors,
        borderColor: cssVar('--wf-surface', '#131316'),
        borderWidth: 2,
        hoverOffset: 8,
      }]
    };
  }

  updateTrendChart(invoices: any[]) {
    if (!invoices) return;

    const labels: string[] = [];
    const data: number[] = [];
    const today = new Date();

    // Last 6 months ending with the current month
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.toLocaleString('en-US', { month: 'short' });
      labels.push(monthName);

      const monthlyTotal = invoices.reduce((sum, inv) => {
        const invDate = this.parseDateOnlyLocal(inv.invoiceDate);
        if (invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear()) {
          return sum + (inv.total || 0);
        }
        return sum;
      }, 0);

      data.push(monthlyTotal);
    }

    if (this.expenseTrendChart) {
      const budgetData = labels.map(() => this.monthlyBudget);
      this.expenseTrendChart = {
        ...this.expenseTrendChart,
        labels: labels,
        datasets: [
          { ...this.expenseTrendChart.datasets[0], data: data },
          { ...this.expenseTrendChart.datasets[1], data: budgetData }
        ]
      };
    }
  }

  private parseDateOnlyLocal(dateOnly: string): Date {
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  initCharts() {
    // Read live tokens — themed automatically per active data-theme.
    const accent       = cssVar('--wf-accent', '#c8a76d');
    const accentFill   = cssVarWithAlpha('--wf-accent', 0.12, '#c8a76d');
    const textMuted    = cssVar('--wf-text-muted', '#72727a');
    const textSec      = cssVar('--wf-text-secondary', '#b8b8bf');
    const surface      = cssVar('--wf-surface', '#131316');
    const gridColor    = cssVarWithAlpha('--wf-border', 0.6, '#26262c');

    this.expenseTrendChart = {
      labels: [],
      datasets: [
        {
          label: 'הוצאות בפועל',
          data: [],
          fill: true,
          borderColor: accent,
          backgroundColor: accentFill,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: 'תקציב יעד',
          data: [],
          fill: false,
          borderColor: textMuted,
          borderDash: [5, 5],
          pointRadius: 0,
          borderWidth: 1.2,
        }
      ]
    };

    this.expenseTrendOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: { usePointStyle: true, color: textSec, font: { size: 11 } }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: textMuted, font: { size: 11 } } },
        y: { grid: { color: gridColor }, ticks: { color: textMuted, font: { size: 11 } } }
      }
    };

    this.categoryChart = {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: this.chartPalette,
          borderColor: surface,
          borderWidth: 2,
          hoverOffset: 8,
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
  }

  exportToExcel() {
    if (!this.expenses || this.expenses.length === 0) {
      alert('אין נתונים לייצוא');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('הוצאות');

    worksheet.addRow(['מזהה', 'ספק', 'תאריך', 'סכום']);
    worksheet.getRow(1).font = { bold: true };

    this.expenses.forEach(exp => {
      worksheet.addRow([
        exp.id ?? '',
        exp.vendor ?? '',
        exp.date ? new Date(exp.date).toLocaleDateString('he-IL') : '',
        exp.amount ?? 0,
      ]);
    });

    worksheet.columns.forEach(column => { column.width = 15; });

    workbook.xlsx.writeBuffer().then((data) => {
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      FileSaver.saveAs(blob, `Dashboard_Expenses_${new Date().getTime()}.xlsx`);
    });
  }
}

/* Trimmed to fields the list endpoint actually provides. status / category
   are NOT on the API contract — they used to be invented here. */
export interface Expense {
  id: number;
  vendor: string;
  date: string;
  amount: number;
}
