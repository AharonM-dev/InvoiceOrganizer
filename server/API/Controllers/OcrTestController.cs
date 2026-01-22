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
        var result = await _ocr.ParseInvoiceAsync(ms.ToArray(), mimeType, ct);

        var documents = result.Documents.Select(document => new
        {
            document.DocumentType,
            document.Confidence,
            Fields = document.Fields.Select(field => new
            {
                Name = field.Key,
                field.Value.FieldType,
                field.Value.Content,
                field.Value.Confidence
            })
        });

        return Ok(documents);
    }
}
