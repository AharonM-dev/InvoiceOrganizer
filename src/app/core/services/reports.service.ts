import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private apiUrl = 'http://localhost:5000/api/reports';
  constructor(private http: HttpClient) {}
  getReports(filters: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get(this.apiUrl, { params });
  }
  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard`);
  }
  getMonthlyExpenses(months: number = 6): Observable<any> {
    return this.http.get(`${this.apiUrl}/monthly`, {
      params: { months: months.toString() },
    });
  }
  getCategoryBreakdown(): Observable<any> {
    return this.http.get(`${this.apiUrl}/categories`);
  }
  getVendorComparison(): Observable<any> {//// משוווה בין הספקים
    return this.http.get(`${this.apiUrl}/vendors/comparison`);
  }
}
