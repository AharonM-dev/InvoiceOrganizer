using System;

namespace API.DTOs;

public class CategorySummaryDto
{
    public int CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public int Count { get; set; }
    public decimal Total { get; set; }
}
