using System;

namespace API.DTOs;

public class InvoiceListDto
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateOnly InvoiceDate { get; set; }
    public decimal Total { get; set; }
    public string? SupplierName { get; set; }
    public string? FilePath { get; set; }
}
