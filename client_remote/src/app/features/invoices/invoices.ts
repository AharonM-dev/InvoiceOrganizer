import { Component, computed, signal } from '@angular/core';
import { Invoice, InvoiceStatus } from '../../core/models/invoice.model';
import { NgFor , NgIf, NgClass, DecimalPipe } from '@angular/common';
import { InvoiceService } from '../../core/services/invoice.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DecimalPipe],
  templateUrl: './invoices.html',
  styleUrl: './invoices.css',
})
export class Invoices {
  protected readonly InvoiceStatus = InvoiceStatus;

  // חיפוש וסינון
  search = signal('');
  statusFilter = signal<InvoiceStatus | 'all'>('all');

  // נתונים מהשירות
  private allInvoices = signal<Invoice[]>([]);

  // רשימת חשבוניות אחרי סינון
  filteredInvoices = computed(() => {
    const term = this.search().toLowerCase();
    const status = this.statusFilter();
    return this.allInvoices().filter(inv => {
      const matchesText =
        inv.vendor.toLowerCase().includes(term) ||
        inv.invoiceNumber.toLowerCase().includes(term) ||
        inv.category.toLowerCase().includes(term);
      const matchesStatus =
        status === 'all' ? true : inv.status === status;

      return matchesText && matchesStatus;
    });
  });

  constructor(private invoiceService: InvoiceService) {
    // טעינה ראשונית
    this.loadInvoices();
  }

  loadInvoices() {
    this.invoiceService.getAll().subscribe({
      next: (data) => this.allInvoices.set(data),
      error: (err) => console.error('Failed to load invoices', err)
    });
  }

  onSearchChange(value: string) {
    this.search.set(value);
  }

  onStatusChange(value: string) {
    if (value === 'all') {
      this.statusFilter.set('all');
    } else {
      this.statusFilter.set(value as InvoiceStatus);
    }
  }

  deleteInvoice(id: number) {
    this.invoiceService.delete(id).subscribe({
      next: () => {
        this.loadInvoices(); // Refresh list after deletion
      },
      error: (err) => console.error('Failed to delete invoice', err)
    });
  }
}
