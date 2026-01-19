namespace API.Services.DocumentAI;

public class DocumentAiOptions
{
    public string ProjectId { get; set; } = "";
    public string Location { get; set; } = "eu";   // או "us" לפי ה-Processor שלך
    public string ProcessorId { get; set; } = "";
    public string? ProcessorVersion { get; set; }  // אופציונלי
}
