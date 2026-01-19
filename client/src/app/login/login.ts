import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink],
   styleUrls: ['./login.css'],
  templateUrl: './login.html'
})
export class LoginComponent {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  loggingForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  });

    onSubmit() {
    if(this.loggingForm.valid) {
        console.log('Loggin...', this.loggingForm.value);
        this.http.post("http://localhost:5042/api/account/login", this.loggingForm.value)
        .subscribe((data:any)  => {
          let loggedUser = {username:data.username, token:data.token }
          localStorage.setItem("user", JSON.stringify(loggedUser));
          this.router.navigate(['/dashboard']);
        })
    }
  }
}

