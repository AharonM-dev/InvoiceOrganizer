# Invoice data — full-stack mismatch diagnosis

## Problem statement

The UI displays incorrect invoice-related data in multiple places: every
invoice shows "Unknown Vendor" / "ספק כללי", category "General" (or empty),
status "מאומת" (or "ממתין") — regardless of the actual database content. A
previous Dashboard-only adjustment did not solve it.

## Root cause

The frontend was built against a fictitious `Invoice` shape that does not
match the real API contract.

### What the backend actually exposes

`server/API/Entities/Invoice.cs`:

```
Id, InvoiceNumber (int), InvoiceDate (DateOnly), FilePath,
SupplierId, Supplier (nav), UserId, User (nav), Items, Total
```

There is **no `Status`** field on `Invoice`. There is **no top-level
category** on `Invoice` (categories live on `InvoiceItem.CategoryId`).
OCR status lives only on `UploadedDocument.OcrStatus`
("Pending" → "PendingValidation" → "Saved" / "Failed") and is never
joined onto `Invoice`.

`server/API/DTOs/InvoiceListDto.cs` (the payload returned by
`GET /api/Invoices`):

```
id, invoiceNumber, invoiceDate, total, supplierName, filePath
```

No `vendor`, no `vendorName`, no nested `supplier`, no `category`, no
`status`, no `currency`, no `confidence`.

`GET /api/Invoices/{id}` returns the full `Invoice` entity (with
`Items`, `Supplier`, `User`) — so a nested `supplier.name` IS available
there, but **only on the detail endpoint, not the list endpoint**.

`GET /api/Invoices/summary/by-supplier` returns `SupplierSummaryDto`:

```
supplierId, count, total
```

No `supplierName` → the Reports "top suppliers" chart has no name to show
unless we look up suppliers separately or fix the DTO.

### What the frontend assumes

`client/src/app/core/models/invoice.model.ts` declares (required):

```
id, invoiceNumber, vendor, date, amount, currency, category, status,
confidence, month, year, createdAt, updatedAt
```

`client/src/app/core/services/invoice.service.ts`,
`mapBackendToFrontend()`:

- Reads `backendInvoice.supplier?.name` → **list response has no `supplier`
  object, only `supplierName`** → always falls through to
  `"Unknown Vendor"`.
- Hardcodes `category: "General"` (no source).
- Hardcodes `status: InvoiceStatus.Verified` (no source).
- Hardcodes `currency: "ILS"` (no source).
- Manufactures `createdAt: new Date()` and `updatedAt: new Date()` on
  every map call (no source).

`client/src/app/features/dashboard/dashboard.ts`,
`loadDashboardData()`:

- Bypasses the service and calls the API directly.
- Reads `inv.vendorName || inv.supplier?.name || 'ספק כללי'` — the real
  field is `supplierName`, so it never matches and always falls through
  to `'ספק כללי'`.
- Reads `inv.category` (always undefined → empty string).
- Reads `inv.status?.toLowerCase()` (always undefined → defaults to
  `'pending'`).
- KPI getters `pendingCount` / `approvedCount` / `rejectedCount` count
  against statuses that don't exist; without a backing source they
  produce misleading numbers (everything counts as pending, or 0).

`client/src/app/features/reports/reports.ts`,
`updateTopVendorsChart()`:

- Reads `inv.vendorName || inv.supplier?.name || 'Unknown'` — same wrong
  field names. Result: every invoice falls into `'Unknown'` and the
  top-vendors chart aggregates everything into a single "Unknown" bar.

`client/src/app/features/invoices/invoices.html`:

- Renders a "קטגוריה" column (`{{ inv.category }}`) that gets
  `"General"` for every row from the service mapper.
- Renders a status column with chip + filter + summary chips that all
  derive from `inv.status`, which is hardcoded to `Verified` for every
  row.

## Why the previous Dashboard-only fix failed

It treated the bug as a status-string casing/labelling problem
(`'approved' | 'pending' | 'rejected'` vs the real `InvoiceStatus` enum
values). In reality the API does not return any `status` field for
invoices at all. The dashboard was reading `inv.status` from an object
where that field is `undefined`. Adding more enum mappings did not help
because the field never existed in the response, and the same problem
exists on the Invoices list and Reports screens, neither of which were
touched.

## Layers that need to be fixed

| Layer | File | Issue |
|---|---|---|
| Backend DTO | `server/API/DTOs/SupplierSummaryDto.cs` + `InvoicesController.SummaryBySupplier` | No `SupplierName` in the per-supplier summary projection |
| Frontend model | `client/src/app/core/models/invoice.model.ts` | Declares fictitious required fields (`status`, `category`, `currency`, `confidence`, `month`, `year`, `createdAt`, `updatedAt`) |
| Frontend service | `client/src/app/core/services/invoice.service.ts` | `mapBackendToFrontend` reads `supplier?.name` (absent on list endpoint), hardcodes `category` / `status` / `currency` |
| Dashboard | `client/src/app/features/dashboard/dashboard.{ts,html}` | Reads `vendorName` (wrong name) + `status` + `category`; KPI strip is status-based with no data backing |
| Invoices list | `client/src/app/features/invoices/{invoices.ts,invoices.html}` | Renders category column, status column, status filter, status chips — none have a data source |
| Reports | `client/src/app/features/reports/reports.ts` | Vendor aggregation reads `vendorName` / `supplier?.name` — wrong field names |

## Fix strategy

Status and per-invoice category simply do not exist in the database. We
will not invent them via frontend fallbacks. We will:

1. **Backend** — add `SupplierName` to `SupplierSummaryDto` and the
   `summary/by-supplier` projection so by-supplier aggregation is usable
   by name.
2. **Frontend model** — make every field the API does not provide
   `optional` (`?:`), so the type reflects reality.
3. **Frontend service** — rewrite the mapper to read the actual fields
   from `InvoiceListDto` (`supplierName`). No hardcoded `Verified` /
   `General` / `ILS`. The detail endpoint mapper continues to read
   `supplier.name` (it is present there).
4. **Invoices list** — drop the category column, status column, status
   filter, and the summary chip row. Drop `inv.category` from the
   search-term match.
5. **Dashboard** — replace the four status-based KPI tiles with KPIs
   derivable from real data (total spend, invoice count, supplier count,
   average per invoice). Drop the status column from the recent-
   invoices table. Map vendor from `supplierName`.
6. **Reports** — change client-side vendor aggregation to read
   `supplierName` instead of the fictitious `vendorName`. (No need to
   switch to the by-supplier endpoint; the current per-invoice client
   aggregation is correct once it reads the right field.)

Each layer is committed separately for reviewability.
