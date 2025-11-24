using System.Collections.Generic;

namespace API.DTOs.Ocr;

public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<ValidationErrorDto> Errors { get; set; } = new();

    // אם הכל עבר טוב ויצרת Invoice:
    public int? InvoiceId { get; set; }
}
