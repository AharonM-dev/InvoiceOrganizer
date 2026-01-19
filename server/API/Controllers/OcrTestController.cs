using API.Services.DocumentAI;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/ocr-test")]
public class OcrTestController : ControllerBase
{
    private readonly IInvoiceOcrService _ocr;

    public OcrTestController(IInvoiceOcrService ocr)
    {
        _ocr = ocr;
    }

    [HttpPost]
    public async Task<IActionResult> Test(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0) return BadRequest("No file");

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);

        var mimeType = file.ContentType; // בד"כ application/pdf
        var doc = await _ocr.ParseInvoiceAsync(ms.ToArray(), mimeType, ct);

        // מחזיר ישויות כדי לראות מה DocumentAI מוציא בפועל
        var entities = doc.Entities.Select(e => new
        {
            e.Type,
            e.MentionText,
            e.Confidence
        });

        return Ok(entities);
    }
}
