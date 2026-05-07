import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { OCRService } from '../../core/services/ocr.service';
import { SupplierService } from '../../core/services/supplier.service';
import { ExtractedData, Supplier } from '../../core/models/invoice.model';
import { SupplierFormModal } from '../../shared/components/supplier-form-modal/supplier-form-modal';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    ButtonModule,
    SupplierFormModal,
  ],
  templateUrl: './review.html',
  styleUrl: './review.css',
})
export class Review implements OnInit {
  draft: ExtractedData | null = null;
  suppliers: Supplier[] = [];

  selectedSupplierId: number | null = null;
  showSupplierModal = false;

  loading = true;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ocrService: OCRService,
    private supplierService: SupplierService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const documentId = Number(this.route.snapshot.paramMap.get('documentId'));

    // טעינת draft ורשימת ספקים במקביל
    forkJoin({
      draft: this.ocrService.getDraft(documentId),
      suppliers: this.supplierService.getAll(),
    }).subscribe({
      next: ({ draft, suppliers }) => {
        this.draft = draft;
        this.suppliers = suppliers;

        // בחירה אוטומטית של ספק לפי נתוני OCR
        if (draft.supplierSupNum) {
          const match = suppliers.find((s) => s.supNum === draft.supplierSupNum);
          if (match) this.selectedSupplierId = match.id;
        }
        if (!this.selectedSupplierId && draft.supplierName) {
          const match = suppliers.find(
            (s) => s.name.toLowerCase() === draft.supplierName?.toLowerCase(),
          );
          if (match) this.selectedSupplierId = match.id;
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'שגיאה בטעינת הנתונים. אנא נסה שוב.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSupplierCreated(newSupplier: Supplier): void {
    this.suppliers = [...this.suppliers, newSupplier];
    this.selectedSupplierId = newSupplier.id;

    if (this.draft) {
      this.draft.supplierId = newSupplier.id;
      this.draft.supplierName = newSupplier.name;
      this.draft.supplierSupNum = newSupplier.supNum;
    }

    this.showSupplierModal = false;
    this.cdr.detectChanges();
  }

  setCategoryId(index: number, event: Event): void {
    if (!this.draft) return;
    const value = (event.target as HTMLInputElement).value;
    this.draft.items[index].categoryId = value ? Number(value) : undefined;
  }

  save(): void {
    if (!this.draft) return;

    if (!this.selectedSupplierId) {
      this.errorMessage = 'יש לבחור ספק לפני שמירה';
      return;
    }

    const missingCategory = this.draft.items.some((item) => !item.categoryId);
    if (missingCategory) {
      this.errorMessage = 'יש לבחור קטגוריה לכל הפריטים';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isSaving = true;

    // הגדרת supplierId מפורש — הבאק-אנד ישתמש בו ישירות
    this.draft.supplierId = this.selectedSupplierId;

    this.ocrService.validate(this.draft).subscribe({
      next: (result) => {
        this.isSaving = false;
        if (result.isValid) {
          this.successMessage = `החשבונית נשמרה בהצלחה (מספר: ${result.invoiceId})`;
          this.cdr.detectChanges();
          setTimeout(() => this.router.navigate(['/invoices']), 2000);
        } else {
          this.errorMessage = result.errors
            .map((e: any) => `${e.field}: ${e.message}`)
            .join(' | ');
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error ?? 'שגיאה בשמירת החשבונית. אנא נסה שוב.';
        this.isSaving = false;
        this.cdr.detectChanges();
      },
    });
  }

  get ocrSupplierHint(): string {
    if (!this.draft) return '';
    const parts: string[] = [];
    if (this.draft.supplierName) parts.push(this.draft.supplierName);
    if (this.draft.supplierSupNum) parts.push(`ח.פ ${this.draft.supplierSupNum}`);
    return parts.join(' · ');
  }
}
