import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ListboxModule } from 'primeng/listbox';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';

import { AuthService } from '../../../core/services/auth.service';
import { ThemeService, Theme } from '../../../core/services/theme.service';
import { SupplierService } from '../../../core/services/supplier.service';
import { Supplier } from '../../../core/models/invoice.model';
import { SupplierFormModal } from '../../../shared/components/supplier-form-modal/supplier-form-modal';
import { CategoryService } from '../../../core/services/category.service';
import { Category } from '../../../core/models/category.model';
import { CategoryFormModal } from '../../../shared/components/category-form-modal/category-form-modal';
import { TopBarComponent } from '../../../layout/top-bar/top-bar';

type SettingsTab = 'profile' | 'categories' | 'suppliers';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    DividerModule,
    ListboxModule,
    DialogModule,
    ToastModule,
    TagModule,
    SupplierFormModal,
    CategoryFormModal,
    TopBarComponent,
  ],
    providers: [MessageService],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class Settings implements OnInit {
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private supplierService = inject(SupplierService);
  private categoryService = inject(CategoryService);

  /** Current theme — read-only signal exposed by ThemeService. */
  readonly theme = this.themeService.theme;
  setTheme(t: Theme): void { this.themeService.setTheme(t); }

  /* Profile form — limited to the two fields that actually exist on the
     Users entity. Email is captured for display only (no update path). */
  profileForm!: FormGroup;
  /** Read-only email derived from the auth state. Email cannot be changed
   *  via this screen — that would require a separate re-auth flow. */
  profileEmail = '';
  profileId = '';
  isSavingProfile = false;

  // Categories Data
  categories: Category[] = [];
  showCategoryModal = false;
  isDeletingCategoryId: number | null = null;

  // Suppliers Data
  suppliers: Supplier[] = [];
  showSupplierModal = false;
  isDeletingId: number | null = null;

  /* UI-only tab state for the side-nav (wireframe sub-nav). Drives which
     section is visible; does not touch loading/save logic. */
  activeTab = signal<SettingsTab>('profile');
  setTab(tab: SettingsTab) { this.activeTab.set(tab); }

  ngOnInit() {
    this.initProfileForm();
    this.hydrateProfileFromAuthState();
    this.refreshProfileFromServer();
    this.loadSuppliers();
    this.loadCategories();
  }

  initProfileForm() {
    this.profileForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(1)]],
    });
  }

  /** Synchronous prefill — the auth state is already in localStorage by
   *  the time the route guard lets the user in, so the form has values
   *  before any HTTP round-trip. */
  private hydrateProfileFromAuthState(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.profileId = user.id;
    this.profileEmail = user.email;
    this.profileForm.patchValue({ username: user.username });
  }

  /** Refreshes profile fields from the server (in case the user updated
   *  the account from another device or the token's payload is stale). */
  private refreshProfileFromServer(): void {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.profileId = profile.id;
        this.profileEmail = profile.email;
        this.profileForm.patchValue({ username: profile.username });
      },
      error: (err) => {
        // Don't blow away the values we already hydrated from auth state.
        console.error('Failed to refresh profile from server', err);
      }
    });
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'שגיאה',
        detail: 'יש למלא שם משתמש תקין',
      });
      return;
    }

    const newUsername = (this.profileForm.value.username as string).trim();
    this.isSavingProfile = true;
    this.authService.updateProfile(newUsername).subscribe({
      next: (profile) => {
        this.isSavingProfile = false;
        this.profileForm.patchValue({ username: profile.username });
        this.messageService.add({
          severity: 'success',
          summary: 'נשמר',
          detail: 'הפרופיל עודכן בהצלחה',
        });
      },
      error: (err) => {
        this.isSavingProfile = false;
        console.error('Failed to update profile', err);
        this.messageService.add({
          severity: 'error',
          summary: 'שגיאה',
          detail: 'עדכון הפרופיל נכשל',
        });
      }
    });
  }

  // ── ניהול קטגוריות ──────────────────────────────────────────────────────

  loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: (data) => (this.categories = data),
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'שגיאה',
          detail: 'טעינת הקטגוריות נכשלה',
        }),
    });
  }

  onCategoryCreated(category: Category): void {
    this.categories = [...this.categories, category];
    this.showCategoryModal = false;
    this.messageService.add({
      severity: 'success',
      summary: 'נוספה',
      detail: `הקטגוריה "${category.name}" נוספה`,
    });
  }

  deleteCategory(category: Category): void {
    if (category.isGlobal) return;
    this.isDeletingCategoryId = category.id;
    this.categoryService.delete(category.id).subscribe({
      next: () => {
        this.categories = this.categories.filter((c) => c.id !== category.id);
        this.isDeletingCategoryId = null;
        this.messageService.add({
          severity: 'info',
          summary: 'נמחקה',
          detail: `הקטגוריה "${category.name}" נמחקה`,
        });
      },
      error: (err) => {
        this.isDeletingCategoryId = null;
        if (err?.status === 409) {
          this.messageService.add({
            severity: 'warn',
            summary: 'לא ניתן למחוק',
            detail: 'הקטגוריה משויכת לפריטי חשבונית קיימים.',
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'שגיאה',
            detail: 'מחיקת הקטגוריה נכשלה',
          });
        }
      },
    });
  }

  // ── ניהול ספקים ──────────────────────────────────────────────────────────

  loadSuppliers(): void {
    this.supplierService.getAll().subscribe({
      next: (data) => (this.suppliers = data),
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'שגיאה',
          detail: 'טעינת רשימת הספקים נכשלה',
        }),
    });
  }

  onSupplierCreated(supplier: Supplier): void {
    this.suppliers = [...this.suppliers, supplier];
    this.showSupplierModal = false;
    this.messageService.add({
      severity: 'success',
      summary: 'נוסף',
      detail: `הספק "${supplier.name}" נוסף בהצלחה`,
    });
  }

  deleteSupplier(supplier: Supplier): void {
    this.isDeletingId = supplier.id;
    this.supplierService.delete(supplier.id).subscribe({
      next: () => {
        this.suppliers = this.suppliers.filter((s) => s.id !== supplier.id);
        this.isDeletingId = null;
        this.messageService.add({
          severity: 'info',
          summary: 'נמחק',
          detail: `הספק "${supplier.name}" נמחק`,
        });
      },
      error: () => {
        this.isDeletingId = null;
        this.messageService.add({
          severity: 'error',
          summary: 'שגיאה',
          detail: 'מחיקת הספק נכשלה',
        });
      },
    });
  }
}
