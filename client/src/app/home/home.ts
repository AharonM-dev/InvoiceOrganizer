import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styleUrls: ['./home.css'],
  templateUrl: './home.html'
})
export class HomeComponent {
  readonly currentYear = new Date().getFullYear();
}
