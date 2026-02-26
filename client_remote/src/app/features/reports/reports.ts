import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';

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
  // KPI Data
  totalSpend = 4520;
  monthlyAverage = 1130;
  topCategory = 'Dining';
  savings = 850;

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
    console.log('Exporting to Excel...');
    // Implementation would use exceljs/file-saver here
  }

  exportToPDF() {
    console.log('Exporting to PDF...');
    // Implementation would use jspdf here
  }
}
