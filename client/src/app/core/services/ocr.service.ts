import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExtractedData } from '../models/invoice.model';

@Injectable({
  providedIn: 'root',
})
export class OCRService {
  private apiUrl = 'http://localhost:5042/api/ocr';

  constructor(private http: HttpClient) {}

  process(uploadedDocumentId: number): Observable<ExtractedData> {
    return this.http.post<ExtractedData>(`${this.apiUrl}/process`, {
      UploadedDocumentId: uploadedDocumentId,
    });
  }

  validate(data: ExtractedData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/validate`, data);
  }
}
