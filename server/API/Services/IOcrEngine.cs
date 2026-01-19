using System.Threading.Tasks;
using API.DTOs.Ocr;

namespace API.Services;

public interface IOcrEngine
{
    Task<ExtractedData> ExtractInvoiceDataAsync(string fullFilePath, int uploadedDocumentId);
}
