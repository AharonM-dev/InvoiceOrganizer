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
export interface ExtractedData {
vendor: string;date: string;
amount: number;
invoiceNumber?: string;
taxAmount?: number;
items?: InvoiceItem[];
}
export interface InvoiceItem {
description: string;
quantity: number;
unitPrice: number;
total: number;
}
