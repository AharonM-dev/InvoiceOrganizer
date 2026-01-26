using API.DTOs.Ocr;
using API.Services.DocumentAI;
using Azure.AI.DocumentIntelligence;

namespace API.Services;

public class OcrEngine : IOcrEngine
{
    private readonly IInvoiceOcrService _invoiceOcrService;

    public OcrEngine(IInvoiceOcrService invoiceOcrService)
    {
        _invoiceOcrService = invoiceOcrService;
    }

    public async Task<ExtractedData> ExtractInvoiceDataAsync(string fullFilePath, int uploadedDocumentId)
    {
        // 1. קריאת הקובץ מהדיסק
        var fileBytes = await File.ReadAllBytesAsync(fullFilePath);
        var mimeType = GetMimeType(fullFilePath);

        // 2. קריאה לשירות OCR (Azure Document Intelligence)
        var analyzeResult = await _invoiceOcrService.ParseInvoiceAsync(fileBytes, mimeType);

        // 3. מיפוי התוצאה ל-ExtractedData
        var extractedData = MapToExtractedData(analyzeResult, uploadedDocumentId);

        return extractedData;
    }

    private ExtractedData MapToExtractedData(AnalyzeResult analyzeResult, int uploadedDocumentId)
    {
        var extractedData = new ExtractedData
        {
            UploadedDocumentId = uploadedDocumentId
        };

        // בדיקה שיש לנו מסמך מנותח
        if (analyzeResult.Documents == null || analyzeResult.Documents.Count == 0)
        {
            return extractedData;
        }

        var document = analyzeResult.Documents[0];

        // מיפוי שדות החשבונית
        if (document.Fields != null)
        {
            // תאריך חשבונית
            if (document.Fields.TryGetValue("InvoiceDate", out var invoiceDateField))
            {
                if (invoiceDateField.FieldType == DocumentFieldType.Date && invoiceDateField.ValueDate.HasValue)
                {
                    // המרה מ-DateTimeOffset ל-DateOnly
                    var dateTime = invoiceDateField.ValueDate.Value.DateTime;
                    extractedData.InvoiceDate = DateOnly.FromDateTime(dateTime);
                }
            }

            // מספר חשבונית
            if (document.Fields.TryGetValue("InvoiceId", out var invoiceIdField))
            {
                var invoiceIdStr = invoiceIdField.Content;
                if (!string.IsNullOrWhiteSpace(invoiceIdStr) && int.TryParse(invoiceIdStr, out var invoiceNumber))
                {
                    extractedData.InvoiceNumber = invoiceNumber;
                }
            }

            // פרטי ספק
            if (document.Fields.TryGetValue("VendorName", out var vendorNameField))
            {
                extractedData.SupplierName = vendorNameField.Content;
            }

            // מספר ספק
            if (document.Fields.TryGetValue("VendorTaxId", out var vendorTaxIdField))
            {
                var taxIdStr = vendorTaxIdField.Content;
                if (!string.IsNullOrWhiteSpace(taxIdStr) && int.TryParse(taxIdStr, out var supNum))
                {
                    extractedData.SupplierSupNum = supNum;
                }
            }

            // פריטי החשבונית
            if (document.Fields.TryGetValue("Items", out var itemsField))
            {
                if (itemsField.FieldType == DocumentFieldType.List && itemsField.ValueList != null)
                {
                    foreach (var itemField in itemsField.ValueList)
                    {
                        if (itemField.FieldType != DocumentFieldType.Dictionary || itemField.ValueDictionary == null)
                            continue;

                        var item = new ExtractedItemDto();

                        if (itemField.ValueDictionary.TryGetValue("Description", out var desc))
                        {
                            item.Name = desc.Content ?? string.Empty;
                        }

                        if (itemField.ValueDictionary.TryGetValue("Amount", out var amount))
                        {
                            if (amount.FieldType == DocumentFieldType.Currency && amount.ValueCurrency != null)
                            {
                                item.Price = (decimal)amount.ValueCurrency.Amount;
                            }
                            else if (!string.IsNullOrWhiteSpace(amount.Content) && decimal.TryParse(amount.Content, out var priceValue))
                            {
                                item.Price = priceValue;
                            }
                        }

                        if (itemField.ValueDictionary.TryGetValue("Quantity", out var qty))
                        {
                            if (qty.FieldType == DocumentFieldType.Double && qty.ValueDouble.HasValue)
                            {
                                item.Quantity = (int)qty.ValueDouble.Value;
                            }
                            else if (!string.IsNullOrWhiteSpace(qty.Content) && int.TryParse(qty.Content, out var qtyValue))
                            {
                                item.Quantity = qtyValue;
                            }
                            else
                            {
                                item.Quantity = 1;
                            }
                        }
                        else
                        {
                            // אם אין Quantity, ברירת מחדל היא 1
                            item.Quantity = 1;
                        }

                        // CategoryId יישאר null - המשתמש יבחר בממשק
                        extractedData.Items.Add(item);
                    }
                }
            }
        }

        return extractedData;
    }

    private string GetMimeType(string filePath)
    {
        var extension = Path.GetExtension(filePath).ToLowerInvariant();
        return extension switch
        {
            ".pdf" => "application/pdf",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".tiff" or ".tif" => "image/tiff",
            _ => "application/octet-stream"
        };
    }
}
