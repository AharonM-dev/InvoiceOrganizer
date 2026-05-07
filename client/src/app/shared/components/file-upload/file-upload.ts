import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.css',
})
export class FileUpload {
  @Output() filesSelected = new EventEmitter<File[]>();
  @Output() validationError = new EventEmitter<string>();

  files: File[] = [];
  isDragOver = false;

  readonly ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff'];
  readonly MAX_SIZE_MB = 10;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (event.dataTransfer?.files) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
      // איפוס ה-input כדי לאפשר בחירה מחדש של אותו קובץ
      input.value = '';
    }
  }

  handleFiles(newFiles: File[]) {
    const validFiles: File[] = [];

    for (const file of newFiles) {
      const error = this.validateFile(file);
      if (error) {
        this.validationError.emit(error);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      this.files = [...this.files, ...validFiles];
      this.emitFiles();
    }
  }

  validateFile(file: File): string | null {
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      return `סוג הקובץ "${ext}" אינו נתמך. נא להעלות PDF, JPG, PNG או TIFF.`;
    }
    if (file.size > this.MAX_SIZE_MB * 1024 * 1024) {
      return `הקובץ "${file.name}" גדול מדי. גודל מקסימלי: ${this.MAX_SIZE_MB}MB.`;
    }
    return null;
  }

  getFileIcon(file: File): string {
    if (file.type === 'application/pdf') return 'fa-file-pdf';
    if (file.type.startsWith('image/')) return 'fa-file-image';
    return 'fa-file';
  }

  getFileIconColor(file: File): string {
    if (file.type === 'application/pdf') return 'text-red-400';
    if (file.type.startsWith('image/')) return 'text-blue-400';
    return 'text-gray-400';
  }

  removeFile(index: number) {
    this.files.splice(index, 1);
    this.emitFiles();
  }

  emitFiles() {
    this.filesSelected.emit([...this.files]);
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  clearFiles() {
    this.files = [];
    this.emitFiles();
  }
}
