import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class OcrNotificationService {
  private hubConnection!: signalR.HubConnection;
  private authService = inject(AuthService);

  public ocrResultSubject = new Subject<{success: boolean, data: any}>();
  public ocrResult$ = this.ocrResultSubject.asObservable();

  public startConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`/hubs/ocr`, {
        accessTokenFactory: () => this.authService.getToken() ?? ''
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('Connected to OcrHub');
        this.hubConnection.invoke('JoinUserGroup');
      })
      .catch(err => console.error('Error connecting to SignalR:', err));

    this.hubConnection.on('OcrFinished', (data) => {
      this.ocrResultSubject.next({ success: true, data });
    });

    this.hubConnection.on('OcrError', (data) => {
      this.ocrResultSubject.next({ success: false, data });
    });
  }

  public stopConnection() {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}
