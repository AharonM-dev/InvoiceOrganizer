import { Component, DestroyRef, effect, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const COLLAPSE_STORAGE_KEY = 'sidebar-collapsed';

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

  /** Mobile-drawer open state (≤1024px viewports). */
  isOpen = signal(false);

  /** Desktop collapsed-rail state. Persisted to localStorage. Ignored on
   *  mobile (the drawer behaviour above takes over below 1024px). */
  isCollapsed = signal(this.readPersistedCollapsed());

  user$ = this.auth.currentUser$;

  menuItems = [
    { label: 'דשבורד', icon: 'pi pi-home', route: '/dashboard' },
    { label: 'העלאת חשבוניות', icon: 'pi pi-cloud-upload', route: '/upload' },
    { label: 'חשבוניות', icon: 'pi pi-file', route: '/invoices' },
    { label: 'דוחות', icon: 'pi pi-chart-bar', route: '/reports' },
    { label: 'אזור אישי', icon: 'pi pi-cog', route: '/settings' }
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

  /** Flip the desktop rail. Persisted to localStorage so the choice
   *  survives refresh / login. */
  toggleCollapsed() {
    const next = !this.isCollapsed();
    this.isCollapsed.set(next);
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
    } catch {
      // ignore (private mode, quota)
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeSidebar();
  }

  logout() {
    this.auth.logout();
  }

  private readPersistedCollapsed(): boolean {
    try {
      return localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }
}
