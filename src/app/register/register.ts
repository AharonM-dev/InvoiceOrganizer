import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

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
  private http = inject(HttpClient);

  registerForm = this.fb.group({
    Username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if(this.registerForm.valid) {
<<<<<<< Updated upstream
        //console.log('Registering...', this.registerForm.value);
=======
        console.log('Registering...', this.registerForm.value);
>>>>>>> Stashed changes
        this.http.post("http://localhost:5042/api/account/register", this.registerForm.value)
        .subscribe((data:any) => {
          let loggedUser = {username:data.username, token:data.token }
          localStorage.setItem("user", JSON.stringify(loggedUser));
          this.router.navigate(['/dashboard']);
        })
    }
  }
}
