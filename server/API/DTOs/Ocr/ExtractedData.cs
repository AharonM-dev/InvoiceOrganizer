using System;
using System.Collections.Generic;

namespace API.DTOs.Ocr;

public class ExtractedData
{
    public int UploadedDocumentId { get; set; }

    // זיהוי ספק
    public string? SupplierName { get; set; }
    public int? SupplierSupNum { get; set; } // מספר ספק כפי שמופיע אצלך ב-Supplier.SupNum

    public DateOnly? InvoiceDate { get; set; }
    public int? InvoiceNumber { get; set; }

    public List<ExtractedItemDto> Items { get; set; } = new List<ExtractedItemDto>();
}
