import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { OCRService } from '../../core/services/ocr.service';
import { ExtractedData } from '../../core/models/invoice.model';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './review.html',
  styleUrl: './review.css',
})
export class Review implements OnInit {
  draft: ExtractedData | null = null;
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private ocrService: OCRService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const documentId = Number(this.route.snapshot.paramMap.get('documentId'));

    this.ocrService.getDraft(documentId).subscribe({
      next: (data) => {
        this.draft = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load draft';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
  save() {
    if (!this.draft) return;

    console.log('Saving draft:', this.draft);

    const missingCategory = this.draft.items.some(item => !item.categoryId);

    if (missingCategory) {
      this.error = 'יש לבחור CategoryId לכל הפריטים';
      return;
    }

    this.ocrService.validate(this.draft).subscribe({
      next: (result) => {
        console.log('Validation result:', result);

        if (result.isValid) {
          alert(`Invoice saved successfully. ID: ${result.invoiceId}`);
        } else {
          this.error = result.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ');
        }
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to save invoice';
      },
    });
  }
  setCategoryId(index: number, event: Event) {
    if (!this.draft) return;

    const value = (event.target as HTMLInputElement).value;
    this.draft.items[index].categoryId = value ? Number(value) : undefined;
  }
}
