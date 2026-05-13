# Account / Profile Settings — load failure diagnosis

## Problem statement

The Account Settings screen never displays the authenticated user's
profile details (username, email, etc.). On open, the form stays
empty and a toast `"Failed to load profile details"` appears.

## Trace from login to settings

### 1. Login API response (server)

`POST /api/account/login` and `POST /api/account/register` both go
through `AccountController` and return `UserDto`:

```
Id, Email, Username, Token
```

Built by `AppUserExtensions.ToDto(...)`. There is no `IsAdmin`,
`FullName`, `Phone`, or `Address` field in the DTO. The `Users`
entity itself only has:

```
Id, Username, Email, PasswordHash, PasswordSalt, IsAdmin
```

— so any profile-style fields beyond `username` and `email` simply
do not exist in the database.

### 2. Client login persistence

`AuthService.setCurrentUser(...)` stores the user under the
localStorage key `'user'` and pushes it into `currentUserSubject`.
`getUserFromStorage()` rehydrates `currentUserSubject` from
`localStorage` on construction, so the user persists across page
refresh. Token + username + email are correctly available
post-login and post-refresh.

`AuthService.UserDto` (TS) declares `isAdmin: boolean` as required,
but the backend `UserDto` doesn't return it — stored value is
`undefined`. Minor casing mismatch, not the root cause.

### 3. Settings screen behaviour

`features/settings/settings/settings.ts` runs:

```ts
this.http.get('http://localhost:5042/api/account/profile', { headers: this.getAuthHeaders() })
  .subscribe({ next: (data) => this.profileForm.patchValue({...}), error: ... });
```

and on save:

```ts
this.http.put('http://localhost:5042/api/account/profile', this.profileForm.value, ...)
```

`profileForm` declares four controls: `fullName`, `email`, `phone`,
`address`.

### 4. The actual server endpoints

`AccountController` only exposes:

- `POST /api/account/register`
- `POST /api/account/login`

**There is no `GET /api/account/profile` and no `PUT
/api/account/profile`.** Both Settings calls return 404. The GET
falls into the error branch → "Failed to load profile details"
toast, and the form stays empty.

Even if the GET endpoint existed, the form expects `fullName /
phone / address` — three fields that simply do not exist on the
`Users` entity. Only `username` and `email` have backing data.

## Root cause

Two cooperating mismatches:

1. **Missing API endpoint.** The frontend Settings calls
   `GET/PUT /api/account/profile`, neither of which is implemented
   on the server. Every load attempt 404s, no profile data is ever
   hydrated.
2. **Phantom form fields.** Even fixing the endpoint, three of the
   four declared controls (`fullName`, `phone`, `address`) have no
   column in the `Users` entity. They were UI invention.

## Why the form stays empty / toast appears

`loadProfileFromApi()` HTTP call returns 404 → error subscriber
runs → MessageService shows the "Failed to load profile details"
toast → `patchValue` never runs → form bound controls keep their
empty initial values.

Importantly, the auth state IS hydrated correctly. The browser DOES
have the user's id / username / email / token. The Settings screen
just doesn't read from it; it tries an HTTP endpoint that doesn't
exist.

## Layers that are wrong

- **Backend API contract** — missing `GET/PUT /api/account/profile`.
- **Settings component logic** — relies on the missing endpoint and
  declares fields with no backing data; does not fall back to the
  user state already cached in `AuthService.currentUser$`.

The auth service, localStorage hydration, route guard, and
interceptor are all functioning correctly.

## Fix strategy

1. **Backend.** Add a minimal, focused pair of endpoints to
   `AccountController`:
   - `GET /api/account/profile` → returns the current user's
     `{ id, email, username }` derived from the JWT
     `NameIdentifier` claim.
   - `PUT /api/account/profile` → updates `username` only (the
     only updatable field that actually exists in the entity).
     Email changes are intentionally out of scope; touching the
     login key needs a different ceremony.
2. **AuthService.** Add `getProfile()` and `updateProfile(username)`
   methods. After update, refresh `currentUserSubject` and
   localStorage so the sidebar reflects the new username.
3. **Settings component.** Reduce the form to fields that actually
   exist: `username` (editable) and `email` (read-only).
   Pre-fill the form synchronously from `AuthService.getCurrentUser()`
   so the user sees data even before the HTTP round-trip. Then
   refresh via `getProfile()` to ensure the form mirrors the
   server.
4. **Do NOT** add `fullName / phone / address` placeholders — no
   data source.

No new state architecture, no token-handling changes, no schema
migration. The auth state contract stays as-is.
