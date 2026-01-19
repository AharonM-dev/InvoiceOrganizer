using API.Data;
using API.DTOs.Ocr;
using API.Entities;
using API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;


namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OcrController : ControllerBase
    {
        private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly IOcrEngine _ocrEngine;

    public OcrController(AppDbContext context,
                         IWebHostEnvironment env,
                         IOcrEngine ocrEngine)
    {
        _context = context;
        _env = env;
        _ocrEngine = ocrEngine;
    }

    // שלב 2: process – מריץ OCR על UploadedDocument ומחזיר ExtractedData ל-UI
    [HttpPost("process")]
    public async Task<ActionResult<ExtractedData>> ProcessOCR(
        [FromBody] ProcessRequest request)
    {
        var doc = await _context.UploadedDocuments
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == request.UploadedDocumentId);

        if (doc == null)
            return NotFound("Uploaded document not found");

        // בניית הנתיב הפיזי לקובץ
        var webRootPath = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var fullPath = Path.Combine(webRootPath, doc.FilePath);

        if (!System.IO.File.Exists(fullPath))
            return NotFound("File not found on disk");

        // קריאה ל"מנוע OCR" – מחזיר ExtractedData (נתונים גולמיים)
        var extracted = await _ocrEngine.ExtractInvoiceDataAsync(fullPath, doc.Id);

        return Ok(extracted);
    }

    // שלב 3: validate – מקבל ExtractedData (אחרי שהמשתמש תיקן/אישר ב-UI)
    // בודק תקינות, ואם הכל טוב – יוצר Invoice ו-Items ב-DB
    [HttpPost("validate")]
    public async Task<ActionResult<ValidationResult>> ValidateExtractedData(
        [FromBody] ExtractedData data)
    {
        var result = new ValidationResult();

        // 1. בדיקות בסיסיות
        if (data.UploadedDocumentId <= 0)
            result.Errors.Add(new ValidationErrorDto { Field = "UploadedDocumentId", Message = "UploadedDocumentId is required" });

        if (data.InvoiceDate == null)
            result.Errors.Add(new ValidationErrorDto { Field = "InvoiceDate", Message = "Invoice date is required" });

        if (data.InvoiceNumber == null)
            result.Errors.Add(new ValidationErrorDto { Field = "InvoiceNumber", Message = "Invoice number is required" });

        if (data.Items == null || data.Items.Count == 0)
            result.Errors.Add(new ValidationErrorDto { Field = "Items", Message = "At least one item is required" });

        // אפשר להוסיף עוד בדיקות...

        // אם כבר יש שגיאות – מחזירים
        if (result.Errors.Any())
        {
            result.IsValid = false;
            return Ok(result);
        }

        // 2. מוצאים את UploadedDocument כדי לדעת מי המשתמש
        var doc = await _context.UploadedDocuments
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == data.UploadedDocumentId);

        if (doc == null)
        {
            result.Errors.Add(new ValidationErrorDto { Field = "UploadedDocumentId", Message = "Uploaded document not found" });
            result.IsValid = false;
            return Ok(result);
        }

        // 3. ניסיון למצוא ספק לפי SupNum + UserId
        Supplier? supplier = null;

        if (data.SupplierSupNum != null)
        {
            supplier = await _context.Suppliers
                .FirstOrDefaultAsync(s =>
                    s.SupNum == data.SupplierSupNum.Value &&
                    s.UserId == doc.UserId);
        }

        if (supplier == null)
        {
            result.Errors.Add(new ValidationErrorDto
            {
                Field = "Supplier",
                Message = "Could not resolve supplier. Please choose a valid supplier."
            });
            result.IsValid = false;
            return Ok(result);
        }

        // 4. בדיקה שהפריטים כוללים CategoryId (אם חובה אצלך)
        if (data.Items != null)
        foreach (var item in data.Items)
        {
            if (item.CategoryId == null)
            {
                result.Errors.Add(new ValidationErrorDto
                {
                    Field = "Items",
                    Message = "Each item must have CategoryId"
                });
            }
        }

        if (result.Errors.Any())
        {
            result.IsValid = false;
            return Ok(result);
        }

        // 5. אם הגענו לכאן – הכל בסדר. יוצרים Invoice ו-Items.
        var invoice = new Invoice
        {
            SupplierId = supplier.Id,
            UserId = doc.UserId,
            InvoiceNumber = data.InvoiceNumber!.Value,
            InvoiceDate = data.InvoiceDate!.Value,
            FilePath = doc.FilePath
        };
        if (data.Items != null)
        foreach (var item in data.Items)
        {
            var invoiceItem = new InvoiceItem
            {
                Name = item.Name,
                Price = item.Price,
                Quantity = item.Quantity,
                CategoryId = item.CategoryId!.Value
            };
            invoice.Items.Add(invoiceItem);
        }

        // חישוב Total
        invoice.ReCalculateTotal();

        _context.Invoices.Add(invoice);

        // אפשר לעדכן את הסטטוס של המסמך
        doc.OcrStatus = "Success";

        await _context.SaveChangesAsync();

        result.IsValid = true;
        result.InvoiceId = invoice.Id;

        return Ok(result);
    }
}
    }

