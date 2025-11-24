using System;

namespace API.DTOs.Ocr;

public class ExtractedItemDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Quantity { get; set; }

    // בצד ה-UI המשתמש יבחר קטגוריה מתוך Category קיימים
    public int? CategoryId { get; set; }
}
