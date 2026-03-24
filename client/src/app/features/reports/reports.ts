import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChartModule,
    CardModule,
    ButtonModule,
    DatePickerModule,
    TableModule
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

      if (!categories || categories.length === 0) {
          labels = ['אין הוצאות מקוטלגות'];
          data = [1];
          bgColors = ['#e2e8f0']; // Grey color for empty state
      } else {
          labels = categories.map(c => c.categoryName || 'אחר');
          data = categories.map(c => c.total || 0);
          bgColors = ['#3b82f6', '#a855f7', '#ec4899', '#22c55e', '#f59e0b'];
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
      // קיבוץ לפי ספק
      const vendorMap = new Map<string, number>();
      
      invoices.forEach(inv => {
          const vendorName = inv.vendorName || inv.supplier?.name || 'Unknown';
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
    const documentStyle = getComputedStyle(document.documentElement);
    // Dark mode specific colors
    const textColor = '#e2e8f0'; // slate-200
    const textColorSecondary = '#64748b'; // slate-500
    const surfaceBorder = 'rgba(255, 255, 255, 0.1)';

    // 1. Monthly Trends (Line Chart)
    this.monthlyTrendData = {
      labels: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר'],
      datasets: [
        {
          label: 'הוצאות',
          data: [2200, 3100, 2800, 4500, 2400, 3800, 4100, 3600, 4520],
          fill: true,
          borderColor: '#4ade80', // Green-400 (Vibrant Green)
          tension: 0.4,
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(74, 222, 128, 0.5)'); // Green glow
            gradient.addColorStop(1, 'rgba(74, 222, 128, 0.0)');
            return gradient;
          },
          borderWidth: 3,
          pointBackgroundColor: '#22c55e', // Green-500
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 8
        }
      ]
    };

    this.monthlyTrendOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.6,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 10,
            displayColors: false
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary,
            font: {
                family: 'Inter',
                size: 11
            }
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
            tickLength: 0
          }
        },
        y: {
          ticks: {
            color: textColorSecondary,
            callback: function(value: any) {
                return '₪' + value;
            },
            font: {
                family: 'Inter',
                size: 11
            }
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
            borderDash: [5, 5]
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    };

    // 2. Category Distribution (Doughnut Chart)
    this.categoryData = {
      labels: ['מגורים', 'מזון', 'תחבורה', 'בילויים', 'שונות'],
      datasets: [
        {
          data: [1200, 800, 450, 300, 150],
          backgroundColor: [
            '#3b82f6', // Blue
            '#a855f7', // Purple
            '#ec4899', // Pink
            '#22c55e', // Green
            '#f59e0b'  // Orange
          ],
          hoverBackgroundColor: [
            '#60a5fa',
            '#c084fc',
            '#f472b6',
            '#4ade80',
            '#fbbf24'
          ],
          borderWidth: 0,
          hoverOffset: 15
        }
      ]
    };

    this.categoryOptions = {
      cutout: '65%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            color: textColor,
            font: {
                family: 'Inter',
                size: 13
            },
            padding: 20
          }
        }
      }
    };

    // 3. Top Vendors (Horizontal Bar Chart)
    this.topVendorsData = {
      labels: ['רמי לוי', 'חשמל', 'סלקום', 'דלק', 'אמזון'],
      datasets: [
        {
          label: 'הוצאה חודשית',
          data: [2500, 1800, 1200, 900, 600],
          backgroundColor: '#06b6d4', // Cyan
          borderRadius: 8,
          barThickness: 20
        }
      ]
    };

    this.topVendorsOptions = {
        indexAxis: 'y',
        maintainAspectRatio: false,
        aspectRatio: 0.8,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
                borderWidth: 0
            }
        },
        scales: {
            x: {
                ticks: {
                    color: textColorSecondary,
                    font: {
                        family: 'Inter',
                        size: 11
                    }
                },
                grid: {
                    color: surfaceBorder,
                    drawBorder: false
                }
            },
            y: {
                ticks: {
                    color: textColor,
                    font: {
                        family: 'Inter',
                        weight: '500',
                        size: 12
                    }
                },
                grid: {
                    display: false,
                    drawBorder: false
                }
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
