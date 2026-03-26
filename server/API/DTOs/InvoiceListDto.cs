using System;

namespace API.DTOs;

public class InvoiceListDto
{
    public int Id { get; set; }
    public int InvoiceNumber { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public decimal Total { get; set; }
    public string? SupplierName { get; set; }
    public string? FilePath { get; set; }
}
