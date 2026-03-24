import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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
    TagModule
  ],
    providers: [MessageService],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class Settings implements OnInit {
    private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private http = inject(HttpClient);

  profileForm!: FormGroup;
  
  // Categories Data
  categories: any[] = [];
  newCategoryName: string = '';

  ngOnInit() {
    this.initProfileForm();
    this.loadProfileFromApi();
    this.loadTypes();
  }

  initProfileForm() {
    // Initialize empty form first
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', []],
      address: ['', []]
    });
  }
  
  loadProfileFromApi() {
    this.http.get('http://localhost:5042/api/account/profile', { headers: this.getAuthHeaders() }).subscribe({
      next: (data: any) => {
        // Populate the form with data from the database
        this.profileForm.patchValue({
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || ''
        });
      },
      error: (err) => {
        console.error('Failed to load profile from backend', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load profile details' });
      }
    });
  }

  loadTypes() {

  }

  saveProfile() {
    if (this.profileForm.valid) {
      this.http.put('http://localhost:5042/api/account/profile', this.profileForm.value, { headers: this.getAuthHeaders() }).subscribe({
        next: (data: any) => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Profile updated successfully' });
                    
          // Optionally update the stored username token info if needed overall
          let userStored = JSON.parse(localStorage.getItem('user') || '{}');
          if (userStored.token) {
             userStored.username = data.username;
             localStorage.setItem('user', JSON.stringify(userStored));
          }
        },
        error: (err) => {
          console.error('Failed to update profile backend', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update profile' });
        }
      });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please fill in all required fields' });
    }
  }

  addCategory() {
    if (this.newCategoryName.trim()) {
      const payload = { Name: this.newCategoryName };
      this.http.post('http://localhost:5042/api/invoices/categories', payload, { headers: this.getAuthHeaders() }).subscribe({
        next: (data: any) => {
      this.categories.push(data);
      this.newCategoryName = '';
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Category added' });
        },
        error: (err) => {
          console.error('Failed to add category', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to add category' });
        }
      });
    }
  }

  deleteCategory(category: any) {
    this.http.delete(`http://localhost:5042/api/invoices/categories/${category.id}`, { headers: this.getAuthHeaders() }).subscribe({
        next: () => {    
    this.categories = this.categories.filter(c => c.id !== category.id);
    this.messageService.add({ severity: 'info', summary: 'Deleted', detail: 'Category removed' });
      },
        error: (err) => {
          console.error('Failed to delete category', err);
          if (err.status === 403) {
            this.messageService.add({ severity: 'warn', summary: 'Access Denied', detail: 'You cannot delete global default categories.' });
          } else {
             this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete category.' });
          }
        }
    });
  }

  private getAuthHeaders(): { [header: string]: string } {
    const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (loggedUser && loggedUser.token) {
      return { 'Authorization': `Bearer ${loggedUser.token}` };
    }
    return {};
  }
}
