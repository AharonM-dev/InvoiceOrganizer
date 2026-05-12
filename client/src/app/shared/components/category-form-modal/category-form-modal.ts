import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Category, CreateCategoryDto } from '../../../core/models/category.model';
import { CategoryService } from '../../../core/services/category.service';

@Component({
  selector: 'app-category-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
  ],
  templateUrl: './category-form-modal.html',
})
export class CategoryFormModal implements OnChanges {
  @Input() visible = false;
  @Output() saved = new EventEmitter<Category>();
  @Output() cancelled = new EventEmitter<void>();

  form: FormGroup;
  isSaving = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.form.reset();
      this.errorMessage = '';
      this.isSaving = false;
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const dto: CreateCategoryDto = { name: this.form.value.name.trim() };

    this.categoryService.create(dto).subscribe({
      next: (category) => {
        this.isSaving = false;
        this.saved.emit(category);
      },
      error: (err) => {
        this.isSaving = false;
        if (err?.status === 409) {
          this.errorMessage = err?.error?.message ?? 'קטגוריה בשם זה כבר קיימת.';
        } else {
          this.errorMessage = 'שמירת הקטגוריה נכשלה. נסה שוב.';
        }
      },
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  get nameControl() { return this.form.get('name'); }
}
