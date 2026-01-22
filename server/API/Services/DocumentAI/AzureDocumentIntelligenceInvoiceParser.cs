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
        if (string.IsNullOrWhiteSpace(_options.Endpoint))
        {
            throw new InvalidOperationException("AzureDocumentIntelligence:Endpoint is required.");
        }

        if (string.IsNullOrWhiteSpace(_options.Key))
        {
            throw new InvalidOperationException("AzureDocumentIntelligence:Key is required.");
        }

        if (string.IsNullOrWhiteSpace(_options.ModelId))
        {
            throw new InvalidOperationException("AzureDocumentIntelligence:ModelId is required.");
        }

        var endpoint = BuildEndpointUri(_options.Endpoint);
        var client = new DocumentIntelligenceClient(endpoint, new AzureKeyCredential(_options.Key));
        var content = new BinaryData(fileBytes);

        var response = await client.AnalyzeDocumentAsync(
            WaitUntil.Completed,
            _options.ModelId,
            content,
            cancellationToken: ct);

        return response.Value;
    }

    private static Uri BuildEndpointUri(string endpoint)
    {
        if (Uri.TryCreate(endpoint, UriKind.Absolute, out var parsed))
        {
            return parsed;
        }

        if (Uri.TryCreate($"https://{endpoint}", UriKind.Absolute, out parsed))
        {
            return parsed;
        }

        throw new InvalidOperationException("AzureDocumentIntelligence:Endpoint must be a valid absolute URI.");
    }
}