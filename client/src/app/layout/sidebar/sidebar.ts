import { Component, DestroyRef, effect, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { filter, map, } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  isOpen = signal(false); // משתנה לניהול מצב התפריט במובייל
  
  user$ = this.auth.currentUser$;

  menuItems = [
    { label: 'דשבורד', icon: 'pi pi-home', route: '/dashboard' },
    { label: 'העלאת חשבוניות', icon: 'pi pi-cloud-upload', route: '/upload' },
    { label: 'חשבוניות', icon: 'pi pi-file', route: '/invoices' },
    { label: 'דוחות', icon: 'pi pi-chart-bar', route: '/reports' },
    { label: 'הגדרות', icon: 'pi pi-cog', route: '/settings' }
  ];

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.closeSidebar());
    
    effect(() => {
      document.body.classList.toggle('sidebar-lock', this.isOpen());
    });
  }
  toggleSidebar() {
    this.isOpen.update(v => !v);
  }
  
  closeSidebar() {
    this.isOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeSidebar();
  }

  logout() {
    this.auth.logout();
  }
}
