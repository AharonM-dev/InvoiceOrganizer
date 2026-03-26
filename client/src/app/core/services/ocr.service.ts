import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExtractedData } from '../models/invoice.model';

@Injectable({
  providedIn: 'root',
})
export class OCRService {
  private apiUrl = '/api/ocr';

  constructor(private http: HttpClient) {}

  process(uploadedDocumentId: number): Observable<ExtractedData> {
    return this.http.post<ExtractedData>(`${this.apiUrl}/process`, {
      UploadedDocumentId: uploadedDocumentId,
    });
  }
  getDraft(documentId: number): Observable<ExtractedData> {
    return this.http.get<ExtractedData>(`${this.apiUrl}/draft/${documentId}`);
  }
  validate(data: ExtractedData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/validate`, data);
  }
}
