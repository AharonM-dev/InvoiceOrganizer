import { Component, computed, signal } from '@angular/core';
import { Invoice } from '../../core/models/invoice.model';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { InvoiceService } from '../../core/services/invoice.service';
import { TopBarComponent } from '../../layout/top-bar/top-bar';

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe, TopBarComponent],
  templateUrl: './invoices.html',
  styleUrl: './invoices.css',
})
export class Invoices {
  // חיפוש
  search = signal('');

  // נתונים מהשירות
  private allInvoices = signal<Invoice[]>([]);

  /* Filtered invoices — searches across the fields the list endpoint
     actually returns (invoiceNumber + vendor/supplierName). Category and
     status are not part of the list contract, so they're not searchable. */
  filteredInvoices = computed(() => {
    const term = this.search().toLowerCase();
    if (!term) return this.allInvoices();
    return this.allInvoices().filter((inv) => {
      return (
        inv.vendor.toLowerCase().includes(term) ||
        inv.invoiceNumber.toLowerCase().includes(term)
      );
    });
  });

  /* Total count for the footer line. */
  totalCount = computed(() => this.allInvoices().length);

  constructor(private invoiceService: InvoiceService) {
    this.loadInvoices();
  }

  loadInvoices() {
    this.invoiceService.getAll().subscribe({
      next: (data) => this.allInvoices.set(data),
      error: (err) => console.error('Failed to load invoices', err),
    });
  }

  onSearchChange(value: string) {
    this.search.set(value);
  }

  deleteInvoice(id: number) {
    this.invoiceService.delete(id).subscribe({
      next: () => this.loadInvoices(),
      error: (err) => console.error('Failed to delete invoice', err),
    });
  }
}
