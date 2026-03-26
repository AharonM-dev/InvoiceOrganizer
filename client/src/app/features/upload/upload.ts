import { Component, ViewChild, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUpload } from '../../shared/components/file-upload/file-upload';
import { UploadService } from '../../core/services/upload.service';
import { OcrNotificationService } from '../../core/services/ocr-notification.service'; // השירות החדש
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
interface UploadStatus {
  fileName: string;
  documentId?: number;
  invoiceId?: number;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
  canReview?: boolean;
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FileUpload],
  templateUrl: './upload.html',
  styleUrl: './upload.css',
})
export class Upload implements OnInit, OnDestroy {
  @ViewChild(FileUpload) fileUploadComponent!: FileUpload;
  files: File[] = [];
  uploadStatuses: UploadStatus[] = [];
  isUploading = false;
  private signalRSubscription!: Subscription;

  constructor(
    private uploadService: UploadService,
    private ocrNotification: OcrNotificationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router
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
        const statusServer = result.data.status;
        if (statusServer === 'PendingValidation') {
          status.status = 'processing';
          status.message = 'OCR הושלם. המסמך ממתין לבדיקה.';
          status.canReview = true;
        } else if (statusServer === 'Failed') {
          status.status = 'error';
          status.message = `שגיאה: ${result.data.processingError ?? 'OCR failed'}`;
          status.canReview = false;
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

    return new Promise<void>((resolve) => {
      this.uploadService.upload(file).subscribe({
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
  openReview(documentId: number) {
    this.router.navigate(['/review', documentId]);
  }
}
