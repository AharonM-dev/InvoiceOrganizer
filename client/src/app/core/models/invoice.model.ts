/* Invoice model — kept aligned with the real API contract.
   - List endpoint (`GET /api/Invoices` → InvoiceListDto) only returns:
       id, invoiceNumber, invoiceDate, total, supplierName, filePath
   - Detail endpoint (`GET /api/Invoices/{id}`) returns the full entity
     (Items, Supplier, User).
   Fields that depend on the detail endpoint, or that have no backing
   data at all, are optional so the type accurately reflects reality. */

export interface Invoice {
  id: number;
  invoiceNumber: string;
  /** Supplier display name (= `supplierName` on the list DTO, or
   *  `supplier.name` on the detail entity). */
  vendor: string;
  vendorId?: number;
  date: Date | string;
  amount: number;
  /** Detail endpoint only — server stores invoice items separately. */
  items?: ExtractedItemDto[];
  filePath?: string;

  // ── Fields below have no backing in the current API list response.
  // They remain on the model so detail/OCR consumers can attach them
  // when available, but are optional everywhere. Do not invent defaults.
  currency?: string;
  category?: string;
  categoryId?: number;
  status?: InvoiceStatus;
  confidence?: number;
  month?: string;
  year?: number;
  pdfUrl?: string;
  imageUrl?: string;
  ocrData?: OCRData;
  createdAt?: Date;
  updatedAt?: Date;
}

/* InvoiceStatus is retained for the upload/OCR flow, which DOES surface
   status values via UploadedDocument.OcrStatus / SignalR. The Invoice
   entity itself never carries a status. */
export enum InvoiceStatus {
  Pending = 'pending',
  Processing = 'processing',
  Processed = 'processed',
  Verified = 'verified',
  Error = 'error'
}

export interface OCRData {
  rawText: string;
  extractedFields: ExtractedData;
  confidence: number;
  processedAt: Date;
}
export interface ExtractedItemDto {
  name?: string;
  price: number;
  quantity: number;
  categoryId?: number;
}

export interface Supplier {
  id: number;
  name: string;
  supNum: number;
  contactEmail?: string;
  phoneNumber?: string;
  address?: string;
}

export interface CreateSupplierDto {
  name: string;
  supNum: number;
  contactEmail?: string;
  phoneNumber?: string;
  address?: string;
}

export interface ExtractedData {
  uploadedDocumentId: number;
  supplierId?: number;       // ID מפורש שנבחר ידנית — עדיפות על שם/מספר
  supplierName?: string;
  supplierSupNum?: number;
  invoiceDate?: string;
  invoiceNumber?: number;
  items: ExtractedItemDto[];
}
