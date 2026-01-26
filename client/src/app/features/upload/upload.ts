import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUpload } from '../../shared/components/file-upload/file-upload';
import { UploadService } from '../../core/services/upload.service';
import { OCRService } from '../../core/services/ocr.service';
import { finalize } from 'rxjs';

interface UploadStatus {
  fileName: string;
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
export class Upload {
  @ViewChild(FileUpload) fileUploadComponent!: FileUpload;
  files: File[] = [];
  uploadStatuses: UploadStatus[] = [];
  isUploading = false;

  constructor(
    private uploadService: UploadService,
    private ocrService: OCRService,
    private cdr: ChangeDetectorRef
  ) {}

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
      this.uploadService.upload(file, null).subscribe({
        next: (response) => {
            // Upload success, start OCR
            status.status = 'processing';
            this.cdr.detectChanges();
            
            this.ocrService.process(response.uploadedDocumentId).subscribe({
                next: (extractedData) => {
                    // OCR success, now validate and save to DB
                    status.message = 'Validating and saving...';
                    this.cdr.detectChanges();
                    
                    this.ocrService.validate(extractedData).subscribe({
                        next: (validationResult) => {
                            if (validationResult.isValid) {
                                status.status = 'completed';
                                status.message = `Saved successfully (Invoice ID: ${validationResult.invoiceId})`;
                            } else {
                                status.status = 'error';
                                status.message = `Validation failed: ${validationResult.errors.map((e: any) => e.message).join(', ')}`;
                            }
                            this.cdr.detectChanges();
                            resolve();
                        },
                        error: (err) => {
                            console.error('Validation Error:', err);
                            status.status = 'error';
                            status.message = 'Validation Failed';
                            this.cdr.detectChanges();
                            resolve();
                        }
                    });
                },
                error: (err) => {
                    console.error('OCR Error:', err);
                    status.status = 'error';
                    status.message = 'OCR Failed';
                    this.cdr.detectChanges();
                    resolve();
                }
            });
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
