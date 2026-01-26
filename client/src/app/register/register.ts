import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  errorMessage: string | null = null;

  registerForm = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if(this.registerForm.valid) {
        this.errorMessage = null; // Clear previous errors
        const { username, email, password } = this.registerForm.value;
        this.authService.register(username!, email!, password!)
        .subscribe({
          next: () => {
            this.router.navigate(['/dashboard']);
          },
          error: (error) => {
            // Handle different error types
            if (error.status === 400) {
              if (typeof error.error === 'string') {
                this.errorMessage = error.error === 'Email is already in use' 
                  ? 'כתובת האימייל כבר קיימת במערכת' 
                  : error.error;
              } else {
                this.errorMessage = 'נתונים לא תקינים';
              }
            } else {
              this.errorMessage = 'אירעה שגיאה ברישום. נסה שנית';
            }
          }
        })
    }
  }
}
