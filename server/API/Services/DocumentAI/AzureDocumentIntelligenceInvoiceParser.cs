using Azure;
using Azure.AI.DocumentIntelligence;
using Microsoft.Extensions.Options;

namespace API.Services.DocumentAI;

public class AzureDocumentIntelligenceInvoiceParser : IInvoiceOcrService
{
    private readonly AzureDocumentIntelligenceOptions _options;

    public AzureDocumentIntelligenceInvoiceParser(IOptions<AzureDocumentIntelligenceOptions> options)
    {
        _options = options.Value;
    }

    public async Task<AnalyzeResult> ParseInvoiceAsync(byte[] fileBytes, string mimeType, CancellationToken ct = default)
    {
        var client = new DocumentIntelligenceClient(new Uri(_options.Endpoint), new AzureKeyCredential(_options.ApiKey));
        var content = new BinaryData(fileBytes);

        var response = await client.AnalyzeDocumentAsync(
            WaitUntil.Completed,
            _options.ModelId,
            content,
            cancellationToken: ct);

        return response.Value;
    }
}
