using System;

namespace API.DTOs;

public class YearSummaryDto
{
    public int Year { get; set; }
    public int Count { get; set; }
    public decimal Total { get; set; }
}
