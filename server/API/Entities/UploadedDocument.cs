using System;

namespace API.Entities;

public class UploadedDocument
{
    public int Id { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
    public string? UserId { get; set; }
    public virtual Users? User { get; set; }
    public string OcrStatus { get; set; } = "Pending";
    public string? ExtractedJson { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string? ProcessingError { get; set; }
}
