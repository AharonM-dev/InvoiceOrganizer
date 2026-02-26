import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Invoice, InvoiceStatus } from '../models/invoice.model';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  private apiUrl = 'http://localhost:5042/api/invoices';

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
      map(backendInvoices => backendInvoices.map(this.mapBackendToFrontend))
    );
  }

  getById(id: number): Observable<Invoice> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(this.mapBackendToFrontend)
    );
  }

  create(invoice: Partial<Invoice>): Observable<Invoice> {
    // For now, we might need to adapt frontend model back to backend DTO if they differ significantly
    // But basic fields might match. Let's send what we have for now or adapt if specific DTO is known.
    // Based on Controller: expects Invoice entity.
    return this.http.post<any>(this.apiUrl, invoice).pipe(
        map(this.mapBackendToFrontend)
    );
  }

  update(invoice: Invoice): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${invoice.id}`, invoice);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Adapter method
  private mapBackendToFrontend(backendInvoice: any): Invoice {
    return {
      id: backendInvoice.id,
      invoiceNumber: backendInvoice.invoiceNumber ? backendInvoice.invoiceNumber.toString() : '',
      vendor: backendInvoice.supplier ? backendInvoice.supplier.name : 'Unknown Vendor',
      vendorId: backendInvoice.supplierId,
      date: backendInvoice.invoiceDate,
      amount: backendInvoice.total,
      currency: 'ILS', // Default as backend doesn't seem to have currency
      category: 'General', // List endpoint doesn't return items to deduce category
      status: InvoiceStatus.Verified, // Default as backend doesn't have status
      confidence: 1,
      month: backendInvoice.invoiceDate ? backendInvoice.invoiceDate.split('-')[1] : '',
      year: backendInvoice.invoiceDate ? parseInt(backendInvoice.invoiceDate.split('-')[0]) : 0,
      createdAt: new Date(), // Not in backend response
      updatedAt: new Date(), // Not in backend response
    };
  }
}
