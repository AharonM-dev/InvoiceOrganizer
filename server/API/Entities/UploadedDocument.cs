using System;

namespace API.Entities;

public class UploadedDocument
{
public int Id { get; set; }

    // נתיב יחסי לקובץ ב-wwwroot, למשל: "uploads/invoices/abc123.pdf"
    public string FilePath { get; set; } = string.Empty;

    public DateTime UploadedAt { get; set; }

    // מי המשתמש שהעלה
    public string? UserId { get; set; }
    public virtual Users? User { get; set; }

    // סטטוס של OCR (לא חובה אבל נחמד)
    public string OcrStatus { get; set; } = "Pending"; // Pending / Success / Failed
}
