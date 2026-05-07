import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CreateSupplierDto, Supplier } from '../../../core/models/invoice.model';
import { SupplierService } from '../../../core/services/supplier.service';

@Component({
  selector: 'app-supplier-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
  ],
  templateUrl: './supplier-form-modal.html',
})
export class SupplierFormModal implements OnChanges {
  @Input() visible = false;
  @Output() saved = new EventEmitter<Supplier>();
  @Output() cancelled = new EventEmitter<void>();

  form: FormGroup;
  isSaving = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private supplierService: SupplierService,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      supNum: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      contactEmail: ['', [Validators.email]],
      phoneNumber: [''],
      address: [''],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // איפוס הטופס בכל פעם שהמודאל נפתח מחדש
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

    const raw = this.form.value;
    const dto: CreateSupplierDto = {
      name: raw.name.trim(),
      supNum: Number(raw.supNum),
      contactEmail: raw.contactEmail?.trim() || undefined,
      phoneNumber: raw.phoneNumber?.trim() || undefined,
      address: raw.address?.trim() || undefined,
    };

    this.supplierService.create(dto).subscribe({
      next: (supplier) => {
        this.isSaving = false;
        this.saved.emit(supplier);
      },
      error: () => {
        this.errorMessage = 'שמירת הספק נכשלה. בדוק את הנתונים ונסה שוב.';
        this.isSaving = false;
      },
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  get nameControl() { return this.form.get('name'); }
  get supNumControl() { return this.form.get('supNum'); }
  get emailControl() { return this.form.get('contactEmail'); }
}
