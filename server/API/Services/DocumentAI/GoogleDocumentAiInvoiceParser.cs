using Google.Cloud.DocumentAI.V1;
using Google.Protobuf;
using Microsoft.Extensions.Options;

namespace API.Services.DocumentAI;

public class GoogleDocumentAiInvoiceParser : IInvoiceOcrService
{
    private readonly DocumentAiOptions _opt;

    public GoogleDocumentAiInvoiceParser(IOptions<DocumentAiOptions> opt)
    {
        _opt = opt.Value;
    }

    public async Task<Document> ParseInvoiceAsync(byte[] fileBytes, string mimeType, CancellationToken ct = default)
    {
        // Endpoint חייב להתאים ל-Location של ה-Processor: eu-documentai / us-documentai וכו'
        var client = await new DocumentProcessorServiceClientBuilder
        {
            Endpoint = $"{_opt.Location}-documentai.googleapis.com"
        }.BuildAsync(ct);

        // Name לפי ProcessorId (הסטנדרטי)
        var name = ProcessorName.FromProjectLocationProcessor(_opt.ProjectId, _opt.Location, _opt.ProcessorId);

        var request = new ProcessRequest
        {
            Name = name.ToString(),
            RawDocument = new RawDocument
            {
                Content = ByteString.CopyFrom(fileBytes),
                MimeType = mimeType // "application/pdf" / "image/jpeg" / "image/png"
            }
        };

        var response = await client.ProcessDocumentAsync(request, cancellationToken: ct);
        return response.Document;
    }
}
