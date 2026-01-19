import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';

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
  
 isSidebarOpen: boolean = false;
 
  expenses: Expense[] = [];
  expenseTrendChart: any;
  expenseTrendOptions: any;
  categoryChart: any;
  categoryOptions: any;


  ngOnInit() {
    this.initMockData();
    this.initCharts();
  }

  initMockData() {
    this.expenses = [
      { id: 'EXP-101', vendor: 'Amazon AWS', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg', category: 'Infrastructure', date: '2024-05-20', amount: 4500, status: 'approved' },
      { id: 'EXP-102', vendor: 'Cibus / 10Bis', logo: '', icon: 'pi pi-shopping-cart', category: 'Welfare', date: '2024-05-19', amount: 1200, status: 'pending' },
      { id: 'EXP-103', vendor: 'Facebook Ads', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg', category: 'Marketing', date: '2024-05-18', amount: 8500, status: 'approved' },
      { id: 'EXP-104', vendor: 'WeWork', logo: '', icon: 'pi pi-building', category: 'Office', date: '2024-05-15', amount: 12000, status: 'approved' },
      { id: 'EXP-105', vendor: 'Apple Store', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', category: 'Equipment', date: '2024-05-14', amount: 6200, status: 'rejected' },
    ];
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