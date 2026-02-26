import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
   styleUrls: ['./login.css'],
  templateUrl: './login.html'
})
export class LoginComponent {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  errorMessage: string | null = null;

  loggingForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

    onSubmit() {
    if(this.loggingForm.valid) {
        this.errorMessage = null; // Clear previous errors
        console.log('Loggin...', this.loggingForm.value);
        const { email, password } = this.loggingForm.value;
        this.authService.login(email!, password!)
        .subscribe({
          next: () => {
            this.router.navigate(['/dashboard']);
          },
          error: (error) => {
            // Handle different error types
            if (error.status === 401) {
              this.errorMessage = 'אימייל או סיסמה שגויים';
            } else if (error.status === 400) {
              this.errorMessage = error.error || 'נתונים לא תקינים';
            } else {
              this.errorMessage = 'אירעה שגיאה בהתחברות. נסה שנית';
            }
          }
        })
    }
  }
}
