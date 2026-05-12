import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { OCRService } from '../../core/services/ocr.service';
import { SupplierService } from '../../core/services/supplier.service';
import { CategoryService } from '../../core/services/category.service';
import { ExtractedData, Supplier } from '../../core/models/invoice.model';
import { Category } from '../../core/models/category.model';
import { SupplierFormModal } from '../../shared/components/supplier-form-modal/supplier-form-modal';
import { CategoryFormModal } from '../../shared/components/category-form-modal/category-form-modal';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    ButtonModule,
    SupplierFormModal,
    CategoryFormModal,
  ],
  templateUrl: './review.html',
  styleUrl: './review.css',
})
export class Review implements OnInit {
  draft: ExtractedData | null = null;
  suppliers: Supplier[] = [];
  categories: Category[] = [];

  selectedSupplierId: number | null = null;
  showSupplierModal = false;

  showCategoryModal = false;
  categoryModalForItemIndex: number | null = null;

  loading = true;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ocrService: OCRService,
    private supplierService: SupplierService,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const documentId = Number(this.route.snapshot.paramMap.get('documentId'));

    // טעינת draft, רשימת ספקים ורשימת קטגוריות במקביל
    forkJoin({
      draft: this.ocrService.getDraft(documentId),
      suppliers: this.supplierService.getAll(),
      categories: this.categoryService.getAll(),
    }).subscribe({
      next: ({ draft, suppliers, categories }) => {
        this.draft = draft;
        this.suppliers = suppliers;
        this.categories = categories;

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

  openCategoryModal(itemIndex: number): void {
    this.categoryModalForItemIndex = itemIndex;
    this.showCategoryModal = true;
  }

  onCategoryCreated(newCategory: Category): void {
    this.categories = [...this.categories, newCategory];

    if (this.categoryModalForItemIndex !== null && this.draft) {
      this.draft.items[this.categoryModalForItemIndex].categoryId = newCategory.id;
    }

    this.showCategoryModal = false;
    this.categoryModalForItemIndex = null;
    this.cdr.detectChanges();
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
