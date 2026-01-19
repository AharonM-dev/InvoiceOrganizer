using System;

namespace API.DTOs.Ocr;

public class ProcessRequest
{
 // מזהה הקובץ שהועלה (מה-Upload)
    public int UploadedDocumentId { get; set; }
}
