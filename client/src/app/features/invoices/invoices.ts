import { Component, computed, signal } from '@angular/core';
import { Invoice, InvoiceStatus } from '../../core/models/invoice.model';
import { NgFor, NgIf, NgClass, DecimalPipe } from '@angular/common';
import { InvoiceService } from '../../core/services/invoice.service';
import { TopBarComponent } from '../../layout/top-bar/top-bar';

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DecimalPipe, TopBarComponent],
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

  /* Counts for the summary chip row — derived only from allInvoices(). */
  statusCounts = computed(() => {
    const all = this.allInvoices();
    return {
      total: all.length,
      verified: all.filter(i => i.status === InvoiceStatus.Verified).length,
      processing: all.filter(i => i.status === InvoiceStatus.Processing).length,
      pending: all.filter(i => i.status === InvoiceStatus.Pending).length,
      error: all.filter(i => i.status === InvoiceStatus.Error).length,
    };
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

  /* Status filter pill click handler — toggles the chip on/off. */
  setStatus(value: InvoiceStatus | 'all') {
    this.statusFilter.set(value);
  }

  statusLabel(status: InvoiceStatus): string {
    switch (status) {
      case InvoiceStatus.Verified:   return 'מאומת';
      case InvoiceStatus.Processing: return 'בעיבוד';
      case InvoiceStatus.Pending:    return 'ממתין';
      case InvoiceStatus.Processed:  return 'הושלם';
      case InvoiceStatus.Error:      return 'שגיאה';
      default: return status;
    }
  }

  statusToneClass(status: InvoiceStatus): string {
    switch (status) {
      case InvoiceStatus.Verified:   return 'wf-tag-success';
      case InvoiceStatus.Processing: return 'wf-tag-accent';
      case InvoiceStatus.Pending:    return 'wf-tag-warn';
      case InvoiceStatus.Error:      return 'wf-tag-danger';
      default: return '';
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
