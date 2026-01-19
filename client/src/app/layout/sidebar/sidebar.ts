import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {
  isOpen = false; // משתנה לניהול מצב התפריט במובייל
  menuItems = [
    { label: 'דשבורד', icon: 'pi pi-home', route: '' },
    { label: 'העלאת חשבוניות', icon: 'pi pi-cloud-upload', route: '/upload' },
    { label: 'חשבוניות', icon: 'pi pi-file', route: '/invoices' },
    { label: 'דוחות', icon: 'pi pi-chart-bar', route: '/reports' },
    { label: 'הגדרות', icon: 'pi pi-cog', route: '/settings' }
 ];
  toggleSidebar() {
    this.isOpen = !this.isOpen;
  }
  
  closeSidebar() {
    this.isOpen = false;
  }
}
