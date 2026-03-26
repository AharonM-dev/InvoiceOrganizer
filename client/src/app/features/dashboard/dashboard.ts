import { Component, OnInit, inject, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes } from '@angular/router';
import { routes } from '../../app.routes';
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
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, TableModule, ButtonModule, ChartModule, 
    TagModule, AvatarModule, ProgressBarModule, TooltipModule, InputTextModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  
  isLoading: boolean = true;
  isSidebarOpen: boolean = false;
 
  expenses: Expense[] = [];
  expenseTrendChart: any;
  expenseTrendOptions: any;
  categoryChart: any;
  categoryOptions: any;
  private http = inject(HttpClient);
  private cd = inject(ChangeDetectorRef);

  ngOnInit() {
    this.loadDashboardData();
    this.initCharts();
  }

  loadDashboardData() {
    
  console.log('initMockData called'); // Debug: Function entry
    const userStr = localStorage.getItem("user");
    if (!userStr) {
        console.error('No user found in localStorage'); // Debug: User check
        return;
    }
    const loggedUser = JSON.parse(userStr);
    const headers = { 'Authorization': `Bearer ${loggedUser.token}` };
    console.log('Fetching data with token:', loggedUser.token.substring(0, 10) + '...'); // Debug: Token check

    // ביצוע שתי קריאות במקביל
    // api/InvoicesItem לא קיים - נשתמש ב-api/Invoices/summary/by-category
    forkJoin({
        invoices: this.http.get<any[]>("http://localhost:5042/api/Invoices", { headers }),
        categorySummary: this.http.get<any[]>("http://localhost:5042/api/Invoices/summary/by-category", { headers })
    }).subscribe({
        next: (response) => {
            console.log('API Response received:', response); // Debug: API response
            
            // 1. עדכון הטבלה מהחשבוניות
            this.expenses = response.invoices.map(inv => ({
                id: inv.id, 
                vendor: inv.vendorName || inv.supplier?.name || 'ספק כללי',
                logo: inv.logoUrl || '',
                icon: inv.icon || '',
                category: inv.category || '',
                date: inv.invoiceDate,
                amount: inv.total,
                status: (inv.status?.toLowerCase() as 'approved' | 'pending' | 'rejected') || 'pending'
            }));
            console.log('Expenses mapped:', this.expenses); // Debug: Mapped data

            // 2. עיבוד הפריטים עבור גרף הקטגוריות
            this.processCategoryData(response.categorySummary);
            
            // 3. עדכון גרף המגמה (אם הנתונים מגיעים מהשרת)
            this.updateTrendChart(response.invoices);

            this.isLoading = false;
            // כאן אנחנו קוראים לו כדי לפתור את השגיאה:
            this.cd.detectChanges();
        },
        error: (err) => {
            console.error("שגיאה בטעינת נתונים", err);
            this.isLoading = false;
            this.cd.detectChanges();
        }
    });
  }

  processCategoryData(summaryData: any[]) {
      let labels = [];
      let data = [];
      let bgColors = [];

      if (!summaryData || summaryData.length === 0) {
          labels = ['אין הוצאות מקוטלגות'];
          data = [1];
          bgColors = ['#e2e8f0']; // Grey color for empty state
      } else {
          labels = summaryData.map(x => x.categoryName || 'אחר');
          data = summaryData.map(x => x.total);
          bgColors = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#a855f7', '#3b82f6'];
      }

      this.categoryChart = {
          labels: labels,
          datasets: [{
              data: data,
              backgroundColor: bgColors,
              hoverOffset: 15,
              borderRadius: 10
          }]
      };
  }

  updateTrendChart(invoices: any[]) {
    if (!invoices) return;

    const labels: string[] = [];
    const data: number[] = [];
    const today = new Date();

    // Generate data for the last 6 months
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = d.toLocaleString('en-US', { month: 'short' });
        labels.push(monthName);

        // Sum invoice totals for this specific month and year
        const monthlyTotal = invoices.reduce((sum, inv) => {
            const invDate = new Date(inv.invoiceDate);
            if (invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear()) {
                return sum + (inv.total || 0);
            }
            return sum;
        }, 0);

        data.push(monthlyTotal);
    }

    // Update the chart object (creating a new reference to trigger change detection in PrimeNG)
    if (this.expenseTrendChart) {
        this.expenseTrendChart = {
            ...this.expenseTrendChart,
            labels: labels,
            datasets: [
                {
                    ...this.expenseTrendChart.datasets[0],
                    data: data
                },
                // Preserve the budget/target line (second dataset)
                this.expenseTrendChart.datasets[1]
            ]
        };
    }
    
    console.log('Updated trend chart data:', data);
  }

  initCharts() {
    // 1. הגדרת גרף מגמה עם קו כפול (הוצאות נוכחיות מול תקציב)
    this.expenseTrendChart = {
      labels: [], // Initial empty state
      datasets: [
        {
          label: 'הוצאות בפועל',
          data: [],
          fill: true,
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          tension: 0.5, // קו סופר חלק ומעוגל
          pointRadius: 0 // מסתיר נקודות למראה נקי
        },
        {
          label: 'תקציב יעד',
          data: [],
          fill: false,
          borderColor: '#64748b',
          borderDash: [5, 5], // קו מקווקו
          pointRadius: 0
        }
      ]
    };

    this.expenseTrendOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', align: 'end', labels: { usePointStyle: true } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { color: '#94a3b8' } }
      }
    };

    // 2. גרף "חצי עוגה" (Semi-Doughnut) למראה מודרני
    this.categoryChart = {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: ['#6366f1', '#f43f5e', '#f59e0b', '#10b981'],
          hoverOffset: 15,
          borderRadius: 10 // פינות מעוגלות בגרף העוגה
        }
      ]
    };

    this.categoryOptions = {
      rotation: -90,      // מתחיל ב-90 מעלות
      circumference: 180, // חצי עיגול בלבד
      cutout: '80%',      // חור גדול באמצע
      plugins: {
        legend: { position: 'bottom' }
      }
    };
  }

  getSeverity(status: string): any {
    switch (status) {
        case 'approved':
            return 'success';
        case 'pending':
            return 'warning';
        case 'rejected':
            return 'danger';
        default:
            return 'info';
    }
  }
  
      exportToExcel() {
      if (!this.expenses || this.expenses.length === 0) {
          alert('אין נתונים לייצוא');
          return;
      }
  
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('הוצאות');
  
      // הוספת כותרת
      worksheet.addRow(['מזהה', 'ספק', 'קטגוריה', 'תאריך', 'סכום', 'סטטוס']);
      worksheet.getRow(1).font = { bold: true };
  
      // מיפוי הנתונים
      this.expenses.forEach(exp => {
          worksheet.addRow([
              exp.id || '',
              exp.vendor || '',
              exp.category || '',
              exp.date ? new Date(exp.date).toLocaleDateString('he-IL') : '',
              exp.amount || 0,
              exp.status || ''
          ]);
      });
  
      // עיצוב רוחב עמודות בסיסי
      worksheet.columns.forEach(column => {
          column.width = 15;
      });
  
      // יצירת הקובץ והורדתו
      workbook.xlsx.writeBuffer().then((data) => {
          const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          FileSaver.saveAs(blob, `Dashboard_Expenses_${new Date().getTime()}.xlsx`);
      });
    }
}

export interface Expense {
    id: string;
    vendor: string;
    logo: string;
    icon?: string;
    category: string;
    date: string;
    amount: number;
    status: 'approved' | 'pending' | 'rejected';
}