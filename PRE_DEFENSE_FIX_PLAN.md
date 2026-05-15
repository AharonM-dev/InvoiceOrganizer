# Pre-Defense Fix Plan

## Verified Issues

| # | Issue | Verified | Files | Risk |
|---|-------|----------|-------|------|
| 1 | Azure credentials config | ✅ | appsettings.json has blank placeholders, code uses `AzureDocumentIntelligence:*` keys | None (doc-only) |
| 2 | Reports hardcoded localhost | ✅ | reports.ts lines 158-159, 234 | Low |
| 3 | Reports manual JWT header | ✅ | reports.ts fetchData + loadTrendChart | Low |
| 4 | SignalR failure payload mismatch | ✅ | OcrWorker.cs line 96 sends `OcrStatus` (PascalCase), Angular expects `status` | Low |
| 5 | OCR null-safety | ✅ | OcrEngine.cs lines 65 (invoiceIdField.Content) and 75 (vendorNameField.Content) | Low |
| 6 | Register overwrites user | ✅ | register.ts lines 43-44: overwrites localStorage with incomplete object after AuthService already set it | Low |
| 7 | GetDraft no error handling | ✅ | OcrController.cs line 226: no try/catch on JsonDeserialize | Low |
| 8 | Delete ownership check missing | ✅ | InvoicesController.cs Delete method: FindAsync(id) no userId filter | Medium |
| 9 | Login user-enumeration | ✅ | AccountController.cs lines 41, 47: separate "Invalid email" / "Invalid password" | Low |

## Exact Files to Change

### Group A — Backend OCR (commit: `fix(ocr): harden failure notifications and parsing`)
- `server/API/Services/OcrWorker.cs` — fix failure payload line 96: `OcrStatus` → `status`
- `server/API/Services/OcrEngine.cs` — null-safe content on lines 65, 75
- `server/API/Controllers/OcrController.cs` — wrap JSON deserialization in try/catch

### Group B — Frontend (commit: `fix(frontend): use environment api and auth service consistently`)
- `client/src/app/features/reports/reports.ts` — replace hardcoded localhost URLs, remove manual headers
- `client/src/app/register/register.ts` — remove manual localStorage.setItem after authService.register()

### Group C — Backend Security (commit: `fix(api): enforce invoice ownership and generic login errors`)
- `server/API/Controllers/InvoicesController.cs` — add userId filter in Delete
- `server/API/Controllers/AccountController.cs` — unify login error messages

## Azure Credentials (verification only — no code change)
Expected `dotnet user-secrets` keys (project: `server/API`):
```
dotnet user-secrets set "TokenKey" "<value>"
dotnet user-secrets set "AzureDocumentIntelligence:Endpoint" "<value>"
dotnet user-secrets set "AzureDocumentIntelligence:Key" "<value>"
dotnet user-secrets set "AzureDocumentIntelligence:ModelId" "<value>"
```
`appsettings.json` already has blank placeholder structure — leave as-is.

## Execution Order
1. Plan file commit
2. Group A — backend OCR → build backend → commit
3. Group B — frontend → build frontend → commit
4. Group C — backend security → build backend → commit

## Build Commands
- Backend: `cd server/API && dotnet build`
- Frontend: `cd client && npm run build`

## Commit Checkpoints
1. `docs: add pre-defense fix plan`
2. `fix(ocr): harden failure notifications and parsing`
3. `fix(frontend): use environment api and auth service consistently`
4. `fix(api): enforce invoice ownership and generic login errors`
