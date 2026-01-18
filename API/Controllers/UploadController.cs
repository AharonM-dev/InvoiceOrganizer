using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using API.Data;
using API.Entities;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UploadController : ControllerBase
    {
        private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _env;

    public UploadController(AppDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<object>> UploadFile(
        [FromForm] UploadInvoiceRequest request)
        {
        var file = request.File;
            var userId = request.UserId;
        
        if (file == null || file.Length == 0)
            return BadRequest("File is empty");

        // 1. שמירת הקובץ בדיסק
        var (relativePath, storedFileName) = await SaveFileAsync(file);

        // 2. יצירת UploadedDocument
        var doc = new UploadedDocument
        {
            FilePath = relativePath,
            UploadedAt = DateTime.UtcNow,
            UserId = userId,
            OcrStatus = "Pending"
        };

        _context.UploadedDocuments.Add(doc);
        await _context.SaveChangesAsync();

        // 3. מחזירים ללקוח מזהה – ה-UI ישתמש בזה לקריאת /api/ocr/process
        return Ok(new
        {
            UploadedDocumentId = doc.Id,
            doc.OcrStatus,
            doc.FilePath
        });
    }

    private async Task<(string RelativePath, string StoredFileName)> SaveFileAsync(IFormFile file)
    {
        var uploadsFolder = Path.Combine("uploads", "invoices");
        var webRootPath = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var targetFolder = Path.Combine(webRootPath, uploadsFolder);

        Directory.CreateDirectory(targetFolder);

        var originalFileName = Path.GetFileName(file.FileName);
        var extension = Path.GetExtension(originalFileName);
        var storedFileName = $"{Guid.NewGuid()}{extension}";
        var fullPath = Path.Combine(targetFolder, storedFileName);

        using (var stream = new FileStream(fullPath, FileMode.Create))
        {
           await file.CopyToAsync(stream);
        }

        var relativePath = Path
            .Combine(uploadsFolder, storedFileName)
            .Replace("\\", "/");

        return (relativePath, storedFileName);
    }
    }
}
public class UploadInvoiceRequest
{
    public IFormFile File { get; set; } = default!;
    public string UserId { get; set; } = default!;
}
