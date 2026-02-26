import { Component, inject, OnInit } from '@angular/core';
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
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class Settings implements OnInit {
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);

  profileForm!: FormGroup;
  
  // Categories Data
  categories: any[] = [];
  newCategoryName: string = '';

  ngOnInit() {
    this.initProfileForm();
    this.loadTypes();
  }

  initProfileForm() {
    // Attempt to load from localStorage or use defaults
    const storedUser = JSON.parse(localStorage.getItem('user_profile') || '{}');
    
    this.profileForm = this.fb.group({
      fullName: [storedUser.fullName || '', [Validators.required]],
      email: [storedUser.email || '', [Validators.required, Validators.email]],
      phone: [storedUser.phone || '', []],
      address: [storedUser.address || '', []]
    });
  }

  loadTypes() {
    // Initialize with some default categories if empty
    const savedCategories = localStorage.getItem('expense_categories');
    if (savedCategories) {
      this.categories = JSON.parse(savedCategories);
    } else {
      this.categories = [
        { name: 'Office Supplies', code: 'OFFICE' },
        { name: 'Travel', code: 'TRAVEL' },
        { name: 'Marketing', code: 'MARKETING' },
        { name: 'Software', code: 'SOFTWARE' }
      ];
    }
  }

  saveProfile() {
    if (this.profileForm.valid) {
      localStorage.setItem('user_profile', JSON.stringify(this.profileForm.value));
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Profile updated successfully' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please fill in all required fields' });
    }
  }

  addCategory() {
    if (this.newCategoryName.trim()) {
      const code = this.newCategoryName.toUpperCase().replace(/\s/g, '_');
      this.categories.push({ name: this.newCategoryName, code: code });
      this.saveCategories();
      this.newCategoryName = '';
      this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Category added' });
    }
  }

  deleteCategory(category: any) {
    this.categories = this.categories.filter(c => c !== category);
    this.saveCategories();
    this.messageService.add({ severity: 'info', summary: 'Deleted', detail: 'Category removed' });
  }

  saveCategories() {
    localStorage.setItem('expense_categories', JSON.stringify(this.categories));
  }
}
