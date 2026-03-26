import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OcrNotificationService {
  private hubConnection!: signalR.HubConnection;
  
  // זרם נתונים שפולט אירועים כשה-OCR מסתיים
  public ocrResultSubject = new Subject<{success: boolean, data: any}>();
  public ocrResult$ = this.ocrResultSubject.asObservable();

  constructor() { }

  // התחלת החיבור - כדאי לקרוא לזה כשהמשתמש מתחבר לאפליקציה
  public startConnection(userId: string) {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5042/hubs/ocr') // וודא שזו הכתובת של ה-API שלך
      .withAutomaticReconnect() // ינסה להתחבר מחדש אוטומטית אם התנתק
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('Connected to OcrHub');
        // הצטרפות לקבוצה האישית של המשתמש
        this.hubConnection.invoke('JoinUserGroup', userId);
      })
      .catch(err => console.error('Error connecting to SignalR:', err));

    // האזנה לאירוע הצלחה מה-Worker
    this.hubConnection.on('OcrFinished', (data) => {
      this.ocrResultSubject.next({ success: true, data });
    });

    // האזנה לאירוע שגיאה מה-Worker
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