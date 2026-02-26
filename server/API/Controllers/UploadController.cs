using Microsoft.AspNetCore.Mvc;
using API.Data;
using API.Entities;
using API.Services;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UploadController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly IBackgroundTaskQueue _queue;
        private readonly OcrWorker _ocrWorker;
        
        public UploadController(AppDbContext context, IWebHostEnvironment env, IBackgroundTaskQueue queue, OcrWorker ocrWorker)
        {
            _context = context;
            _env = env;
            _queue = queue;
            _ocrWorker = ocrWorker;
        }

        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<object>> UploadFile(
            [FromForm] IFormFile file,
            [FromForm] string? userId)
        {
            if (file == null || file.Length == 0)
                return BadRequest("File is empty");

            // 1) שמירת הקובץ בדיסק
            var (relativePath, storedFileName) = await SaveFileAsync(file);

            // 2) יצירת UploadedDocument
            var doc = new UploadedDocument
            {
                FilePath = relativePath,
                UploadedAt = DateTime.UtcNow,
                UserId = userId,
                OcrStatus = "Processing"
            };

            _context.UploadedDocuments.Add(doc);
            await _context.SaveChangesAsync();

            await _queue.QueueBackgroundWorkItemAsync(async token =>
            {
            //var worker = HttpContext.RequestServices.GetRequiredService<OcrWorker>();
                await _ocrWorker.ProcessDocumentAsync(doc.Id, token);
            });

            // 3) מחזירים ללקוח מזהה
            return Ok(new
            {
                UploadedDocumentId = doc.Id,
                Status = doc.OcrStatus,
                FilePath = doc.FilePath
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
