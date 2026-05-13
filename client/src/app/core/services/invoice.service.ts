import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Invoice } from '../models/invoice.model';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  private apiUrl = '/api/invoices';

  // We keep a signal for state management if needed, but primarily work with Observables now
  private _invoices = signal<Invoice[]>([]);
  invoices = this._invoices.asReadonly();

  constructor(private http: HttpClient) {}

  getAll(filters?: any): Observable<Invoice[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }

    return this.http.get<any[]>(this.apiUrl, { params }).pipe(
      map(backendInvoices => backendInvoices.map(b => this.mapListItem(b)))
    );
  }

  getById(id: number): Observable<Invoice> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(b => this.mapDetail(b))
    );
  }

  create(invoice: Partial<Invoice>): Observable<Invoice> {
    return this.http.post<any>(this.apiUrl, invoice).pipe(
      map(b => this.mapDetail(b))
    );
  }

  update(invoice: Invoice): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${invoice.id}`, invoice);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /* List endpoint mapper. Reads ONLY fields present on InvoiceListDto:
       id, invoiceNumber, invoiceDate, total, supplierName, filePath.
     No invented status / category / currency / timestamps. */
  private mapListItem(b: any): Invoice {
    return {
      id: b.id,
      invoiceNumber: b.invoiceNumber != null ? String(b.invoiceNumber) : '',
      vendor: b.supplierName ?? '',
      date: b.invoiceDate,
      amount: b.total,
      filePath: b.filePath,
    };
  }

  /* Detail endpoint mapper. The full Invoice entity is returned with
     Items, Supplier, User. Surface the additional fields when present. */
  private mapDetail(b: any): Invoice {
    return {
      id: b.id,
      invoiceNumber: b.invoiceNumber != null ? String(b.invoiceNumber) : '',
      vendor: b.supplier?.name ?? b.supplierName ?? '',
      vendorId: b.supplierId,
      date: b.invoiceDate,
      amount: b.total,
      filePath: b.filePath,
      items: b.items,
    };
  }
}
