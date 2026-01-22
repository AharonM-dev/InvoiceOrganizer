namespace API.Services.DocumentAI;

public class AzureDocumentIntelligenceOptions
{
    public string Endpoint { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string ModelId { get; set; } = "prebuilt-invoice";
}
