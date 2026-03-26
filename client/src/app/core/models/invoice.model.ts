    export interface Invoice {
    id: number;
    invoiceNumber: string;
    vendor: string;
    vendorId?: number;
    date: Date | string;
    amount: number;
    currency: string;
    category: string;
    categoryId?: number;
    status: InvoiceStatus;
    confidence: number;
    month: string;
    year: number;
    pdfUrl?: string;
    imageUrl?: string;
    ocrData?: OCRData;
    createdAt: Date;
    updatedAt: Date;
    }
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

export interface ExtractedData {
  uploadedDocumentId: number;
  supplierName?: string;
  supplierSupNum?: number;
  invoiceDate?: string;
  invoiceNumber?: number;
  items: ExtractedItemDto[];
}
