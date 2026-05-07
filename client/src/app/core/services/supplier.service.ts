import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateSupplierDto, Supplier } from '../models/invoice.model';

@Injectable({
  providedIn: 'root',
})
export class SupplierService {
  private url = '/api/suppliers';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(this.url);
  }

  create(dto: CreateSupplierDto): Observable<Supplier> {
    return this.http.post<Supplier>(this.url, dto);
  }

  update(id: number, dto: CreateSupplierDto): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}`, { id, ...dto });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
