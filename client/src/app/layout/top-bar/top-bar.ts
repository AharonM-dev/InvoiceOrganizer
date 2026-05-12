import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.css'
})
export class TopBarComponent {
  @Input() title = '';
  @Input() breadcrumb = '';
  @Input() showSearch = true;
}
