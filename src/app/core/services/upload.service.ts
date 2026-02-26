import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private apiUrl = 'http://localhost:5042/api/upload';

  constructor(private http: HttpClient) {}

  upload(file: File, userId: string): Observable<any> {
    const formData = new FormData();
    formData.append('File', file);
    formData.append('UserId', userId);

    return this.http.post(this.apiUrl, formData);
  }
}
