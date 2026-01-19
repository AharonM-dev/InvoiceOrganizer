using System;

namespace API.DTOs;

public class SupplierSummaryDto
{
    public int SupplierId { get; set; }
    public int Count { get; set; }
    public decimal Total { get; set; }
}
