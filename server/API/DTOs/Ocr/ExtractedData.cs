using System;
using System.Collections.Generic;

namespace API.DTOs.Ocr;

public class ExtractedData
{
    public int UploadedDocumentId { get; set; }

    // זיהוי ספק
    public int? SupplierId { get; set; }     // ID מפורש של ספק שנבחר ידנית ב-UI (עדיפות ראשונה)
    public string? SupplierName { get; set; }
    public int? SupplierSupNum { get; set; } // מספר ספק כפי שמופיע אצלך ב-Supplier.SupNum
    public string? Address { get; set; }

    public DateOnly? InvoiceDate { get; set; }
    public string? InvoiceNumber { get; set; }

    public List<ExtractedItemDto> Items { get; set; } = new List<ExtractedItemDto>();
}
