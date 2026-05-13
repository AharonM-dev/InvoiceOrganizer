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
  /** Backend currently omits IsAdmin from the login/register UserDto;
   *  kept optional so older payloads without it don't break the type. */
  isAdmin?: boolean;
}

interface StoredUser {
  id: string;
  email: string;
  username: string;
  token: string;
  isAdmin?: boolean;
}

/** Server payload from GET /api/account/profile. */
export interface ProfileDto {
  id: string;
  email: string;
  username: string;
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

  /**
   * Loads the latest profile from the server. Returns the response and
   * merges the fresh `username` + `email` into the stored user so other
   * subscribers (e.g. sidebar) stay in sync.
   */
  getProfile(): Observable<ProfileDto> {
    return this.http.get<ProfileDto>(`${this.apiUrl}/profile`)
      .pipe(tap(profile => this.mergeProfileIntoStoredUser(profile)));
  }

  /**
   * Persists username changes. Updates the cached user on success so
   * the new name appears everywhere it's bound without needing a logout.
   */
  updateProfile(username: string): Observable<ProfileDto> {
    return this.http.put<ProfileDto>(`${this.apiUrl}/profile`, { username })
      .pipe(tap(profile => this.mergeProfileIntoStoredUser(profile)));
  }

  private setCurrentUser(user: UserDto): void {
    const loggedUser: StoredUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      token: user.token,
      isAdmin: user.isAdmin
    };
    localStorage.setItem('user', JSON.stringify(loggedUser));
    this.currentUserSubject.next(loggedUser);
  }

  /** Keeps the token intact; only refreshes the profile fields. */
  private mergeProfileIntoStoredUser(profile: ProfileDto): void {
    const current = this.currentUserSubject.value;
    if (!current) return;
    const merged: StoredUser = {
      ...current,
      id: profile.id,
      email: profile.email,
      username: profile.username,
    };
    localStorage.setItem('user', JSON.stringify(merged));
    this.currentUserSubject.next(merged);
  }

  getCurrentUserId(): string | null {
  const user = this.getCurrentUser();
  return user ? user.id : null;
  }
  private getUserFromStorage(): StoredUser | null {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  }
}
