using Azure.AI.DocumentIntelligence;

namespace API.Services.DocumentAI;

public interface IInvoiceOcrService
{
    Task<AnalyzeResult> ParseInvoiceAsync(byte[] fileBytes, string mimeType, CancellationToken ct = default);
}
