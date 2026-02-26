import { Component, ViewChild, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUpload } from '../../shared/components/file-upload/file-upload';
import { UploadService } from '../../core/services/upload.service';
import { OcrNotificationService } from '../../core/services/ocr-notification.service'; // השירות החדש
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';
interface UploadStatus {
  fileName: string;
  documentId?: number;
  invoiceId?: number;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FileUpload],
  templateUrl: './upload.html',
  styleUrl: './upload.css',
})
export class Upload implements OnInit, OnDestroy{
  @ViewChild(FileUpload) fileUploadComponent!: FileUpload;
  files: File[] = [];
  uploadStatuses: UploadStatus[] = [];
  isUploading = false;
  private signalRSubscription!: Subscription;

  constructor(
    private uploadService: UploadService,
    private ocrNotification: OcrNotificationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      // שלב קריטי: התחלת החיבור בפועל
      this.ocrNotification.startConnection(userId);
    }
    // הרשמה לעדכונים מהשרת
    this.signalRSubscription = this.ocrNotification.ocrResult$.subscribe(result => {
      console.log('SignalR Message Received:', result); // לוג לבדיקה
      // מציאת השורה המתאימה בטבלה לפי המזהה שחזר מהשרת
      const statusIndex = this.uploadStatuses.findIndex(s => s.documentId === result.data.documentId);
      
      if (statusIndex !== -1) {
        const status = this.uploadStatuses[statusIndex];
        
        if (result.success) {
          status.status = 'completed';
          status.invoiceId = result.data.invoiceId;
          status.message = `הושלם! (חשבונית: ${result.data.invoiceId})`;
        } else {
          status.status = 'error';
          status.message = `שגיאה: ${result.data.message}`;
        }
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    if (this.signalRSubscription) {
      this.signalRSubscription.unsubscribe();
    }
  }

  onFilesSelected(files: File[]) {
    // If files are cleared (empty array), don't reset statuses if we just finished uploading
    if (files.length === 0) {
        this.files = [];
        return;
    }
    
    this.files = files;
    this.uploadStatuses = files.map((file) => ({
      fileName: file.name,
      progress: 0,
      status: 'pending',
    }));
  }

  async onUpload() {
    if (this.files.length === 0) return;

    this.isUploading = true;

    for (let i = 0; i < this.files.length; i++) {
        await this.processFile(this.files[i], i);
    }

    this.isUploading = false;
    this.files = []; // Internal clear
    
    // Clear the UI component
    if (this.fileUploadComponent) {
        this.fileUploadComponent.clearFiles();
    }
  }

  private async processFile(file: File, index: number): Promise<void> {
    const status = this.uploadStatuses[index];
    status.status = 'uploading';
    this.cdr.detectChanges(); // Force update

    const userId = this.authService.getCurrentUserId();
    return new Promise<void>((resolve) => {
      this.uploadService.upload(file, userId || '').subscribe({
        next: (response) => {
            status.documentId = response.uploadedDocumentId;
            status.message = 'הקובץ עלה, מעבד נתונים ברקע...';  
            status.status = 'processing';
            this.cdr.detectChanges();
            resolve(); // ממשיכים לקובץ הבא מיד, לא מחכים ל-OCR
        },
        error: (err) => {
          console.error('Upload Error:', err);
          status.status = 'error';
          status.message = 'Upload Failed';
          this.cdr.detectChanges();
          resolve();
        },
      });
    });
  }
}
