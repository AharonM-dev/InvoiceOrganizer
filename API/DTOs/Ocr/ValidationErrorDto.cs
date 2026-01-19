using System;

namespace API.DTOs.Ocr;

public class ValidationErrorDto
{
    public string Field { get; set; } = string.Empty;   // למשל: "Supplier", "InvoiceDate"
    public string Message { get; set; } = string.Empty; // טקסט שגיאה למשתמש
}
