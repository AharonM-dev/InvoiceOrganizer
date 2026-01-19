using Google.Cloud.DocumentAI.V1;

namespace API.Services.DocumentAI;

public interface IInvoiceOcrService
{
    Task<Document> ParseInvoiceAsync(byte[] fileBytes, string mimeType, CancellationToken ct = default);
}
