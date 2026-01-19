import { Component } from '@angular/core'; //  אפשרות שנייה שנראה לי שהוא עבד 
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styleUrls: ['./home.css'],
  templateUrl: './home.html'
})
export class HomeComponent {}