<<<<<<< Updated upstream
import { Component, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes } from '@angular/router';
import { routes } from '../../app.routes';
=======
import { Component, OnInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
>>>>>>> Stashed changes
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

import { ChangeDetectorRef,  } from '@angular/core';
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
  
 
  expenses: Expense[] = [];
  expenseTrendChart: any;
  expenseTrendOptions: any;
  categoryChart: any;
  categoryOptions: any;
 isSidebarOpen: any;

  private http = inject(HttpClient);
  private cd = inject(ChangeDetectorRef);
 
  ngOnInit() {
    this.initMockData();
    this.initCharts();
  }



  initMockData() {
<<<<<<< Updated upstream
    
   // let loggedUser = JSON.parse(localStorage.getItem("user") ?? "")
     // this.http.get("http://localhost:5042/api/invoices", {headers:{'Authorization': loggedUser.token}})
      //  .subscribe((arrayOfInvoices:any) => {
        //  this.expenses = arrayOfInvoices;
        //})
    this.expenses = [
      { id: 'EXP-101', vendor: 'Amazon AWS', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg', category: 'Infrastructure', date: '2024-05-20', amount: 4500, status: 'approved' },
      { id: 'EXP-102', vendor: 'Cibus / 10Bis', logo: '', icon: 'pi pi-shopping-cart', category: 'Welfare', date: '2024-05-19', amount: 1200, status: 'pending' },
      { id: 'EXP-103', vendor: 'Facebook Ads', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg', category: 'Marketing', date: '2024-05-18', amount: 8500, status: 'approved' },
      { id: 'EXP-104', vendor: 'WeWork', logo: '', icon: 'pi pi-building', category: 'Office', date: '2024-05-15', amount: 12000, status: 'approved' },
      { id: 'EXP-105', vendor: 'Apple Store', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', category: 'Equipment', date: '2024-05-14', amount: 6200, status: 'rejected' },
    ];
=======
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
                category: inv.category || '',
                date: inv.invoiceDate,
                amount: inv.total,
                status: inv.status?.toLowerCase() || 'pending'
            }));
            console.log('Expenses mapped:', this.expenses); // Debug: Mapped data

            // 2. עיבוד הפריטים עבור גרף הקטגוריות
            this.processCategoryData(response.categorySummary);
            
            // 3. עדכון גרף המגמה (אם הנתונים מגיעים מהשרת)
            this.updateTrendChart(response.invoices);
            // כאן אנחנו קוראים לו כדי לפתור את השגיאה:
          this.cd.detectChanges();
        },
        error: (err) => console.error("שגיאה בטעינת נתונים", err)
    });
  }

  // פונקציית עזר לעיבוד קטגוריות (מותאם ל-CategorySummaryDto)
  processCategoryData(summaryData: any[]) {
      // summaryData מגיע כבר מסוכם מהשרת
      const labels = summaryData.map(x => x.categoryName || 'אחר');
      const data = summaryData.map(x => x.total);

      this.categoryChart = {
          labels: labels,
          datasets: [{
              data: data,
              backgroundColor: ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#a855f7', '#3b82f6'],
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
>>>>>>> Stashed changes
  }

  initCharts() {
    // 1. הגדרת גרף מגמה עם קו כפול (הוצאות נוכחיות מול תקציב)
    this.expenseTrendChart = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'הוצאות בפועל',
          data: [42, 48, 41, 55, 48, 60],
          fill: true,
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          tension: 0.5, // קו סופר חלק ומעוגל
          pointRadius: 0 // מסתיר נקודות למראה נקי
        },
        {
          label: 'תקציב יעד',
          data: [45, 45, 45, 45, 45, 45],
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
      labels: ['Marketing', 'IT', 'Offices', 'Others'],
      datasets: [
        {
          data: [35, 25, 20, 20],
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