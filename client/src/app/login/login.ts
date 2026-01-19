import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink],
   styleUrls: ['./login.css'],
  templateUrl: './login.html'
})
export class LoginComponent {}
