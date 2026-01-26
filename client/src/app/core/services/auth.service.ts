import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface UserDto {
  id: string;
  email: string;
  username: string;
  token: string;
}

interface StoredUser {
  username: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/account`;
  
  private currentUserSubject = new BehaviorSubject<StoredUser | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  login(email: string, password: string): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap(user => this.setCurrentUser(user))
      );
  }

  register(username: string, email: string, password: string): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.apiUrl}/register`, { username, email, password })
      .pipe(
        tap(user => this.setCurrentUser(user))
      );
  }

  logout(): void {
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getCurrentUser(): StoredUser | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    const user = this.getCurrentUser();
    return user ? user.token : null;
  }

  private setCurrentUser(user: UserDto): void {
    const loggedUser: StoredUser = { username: user.username, token: user.token };
    localStorage.setItem('user', JSON.stringify(loggedUser));
    this.currentUserSubject.next(loggedUser);
  }

  private getUserFromStorage(): StoredUser | null {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  }
}
