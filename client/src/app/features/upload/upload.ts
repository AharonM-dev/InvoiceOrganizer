import { Component, ViewChild, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { FileUpload } from '../../shared/components/file-upload/file-upload';
import { UploadService } from '../../core/services/upload.service';
import { OcrNotificationService } from '../../core/services/ocr-notification.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { TopBarComponent } from '../../layout/top-bar/top-bar';

interface UploadStatus {
  fileName: string;
  fileIcon: string;
  fileIconColor: string;
  documentId?: number;
  invoiceId?: number;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'PendingValidation' | 'completed' | 'error';
  message?: string;
  canReview?: boolean;
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FileUpload, TopBarComponent],
  templateUrl: './upload.html',
  styleUrl: './upload.css',
})
export class Upload implements OnInit, OnDestroy {
  @ViewChild(FileUpload) fileUploadComponent!: FileUpload;

  files: File[] = [];
  uploadStatuses: UploadStatus[] = [];
  isUploading = false;
  validationErrors: string[] = [];

  private signalRSubscription!: Subscription;

  constructor(
    private uploadService: UploadService,
    private ocrNotification: OcrNotificationService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit() {
    this.ocrNotification.startConnection();
    this.signalRSubscription = this.ocrNotification.ocrResult$.subscribe((result) => {
      const statusIndex = this.uploadStatuses.findIndex(
        (s) => s.documentId === result.data.documentId,
      );

      if (statusIndex !== -1) {
        const status = this.uploadStatuses[statusIndex];
        const statusServer = result.data.status;
        if (statusServer === 'PendingValidation') {
          status.status = 'PendingValidation';
          status.message = 'ה-OCR הושלם. המסמך ממתין לאישורך.';
          status.canReview = true;
        } else if (statusServer === 'Failed') {
          status.status = 'error';
          status.message = `שגיאת OCR: ${result.data.processingError ?? 'עיבוד נכשל'}`;
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
    if (files.length === 0) {
      this.files = [];
      return;
    }
    this.files = files;
    this.uploadStatuses = files.map((file) => ({
      fileName: file.name,
      fileIcon: this.getFileIcon(file),
      fileIconColor: this.getFileIconColor(file),
      progress: 0,
      status: 'pending',
    }));
  }

  onValidationError(msg: string) {
    this.validationErrors = [...this.validationErrors, msg];
    // מחיקה אוטומטית אחרי 5 שניות
    setTimeout(() => {
      this.validationErrors = this.validationErrors.filter((e) => e !== msg);
      this.cdr.detectChanges();
    }, 5000);
  }

  dismissError(index: number) {
    this.validationErrors.splice(index, 1);
    this.validationErrors = [...this.validationErrors];
  }

  async onUpload() {
    if (this.files.length === 0) return;

    this.isUploading = true;

    for (let i = 0; i < this.files.length; i++) {
      await this.processFile(this.files[i], i);
    }

    this.isUploading = false;
    this.files = [];

    if (this.fileUploadComponent) {
      this.fileUploadComponent.clearFiles();
    }
  }

  private async processFile(file: File, index: number): Promise<void> {
    const status = this.uploadStatuses[index];
    status.status = 'uploading';
    status.progress = 0;
    this.cdr.detectChanges();

    return new Promise<void>((resolve) => {
      this.uploadService.upload(file).subscribe({
        next: (event: HttpEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            status.progress = Math.round((event.loaded / event.total) * 100);
            this.cdr.detectChanges();
          } else if (event.type === HttpEventType.Response) {
            status.documentId = event.body.uploadedDocumentId;
            status.status = 'processing';
            status.progress = 100;
            status.message = 'מעבד נתונים ברקע...';
            this.cdr.detectChanges();
            resolve();
          }
        },
        error: (err) => {
          console.error('Upload Error:', err);
          status.status = 'error';
          status.message = err?.error?.message ?? 'שגיאה בהעלאת הקובץ. אנא נסה שנית.';
          this.cdr.detectChanges();
          resolve();
        },
      });
    });
  }

  openReview(documentId: number | undefined) {
    if (documentId) {
      this.router.navigate(['/review', documentId]);
    }
  }

  getStatusLabel(status: UploadStatus['status']): string {
    const map: Record<string, string> = {
      pending: 'ממתין',
      uploading: 'מעלה...',
      processing: 'מעבד OCR',
      PendingValidation: 'ממתין לאישור',
      completed: 'הושלם',
      error: 'שגיאה',
    };
    return map[status] ?? status;
  }

  getStatusClasses(status: UploadStatus['status']): string {
    /* Returns wf-tag tone modifier classes (used alongside `.wf-tag`). */
    const map: Record<string, string> = {
      pending: '',
      uploading: 'wf-tag-accent',
      processing: 'wf-tag-accent',
      PendingValidation: 'wf-tag-warn',
      completed: 'wf-tag-success',
      error: 'wf-tag-danger',
    };
    return map[status] ?? '';
  }

  /* Returns a PrimeIcons class for the file kind. Previously used Font Awesome
     classes; FA isn't actually loaded globally, so we use PrimeIcons here. */
  private getFileIcon(file: File): string {
    if (file.type === 'application/pdf') return 'pi-file-pdf';
    if (file.type.startsWith('image/')) return 'pi-image';
    return 'pi-file';
  }

  private getFileIconColor(file: File): string {
    /* Kept on the interface so the upload-status row can colour-code icons,
       but resolved via tokens rather than Tailwind utility classes. */
    if (file.type === 'application/pdf') return 'fu-icon-pdf';
    if (file.type.startsWith('image/')) return 'fu-icon-image';
    return 'fu-icon-file';
  }
}
