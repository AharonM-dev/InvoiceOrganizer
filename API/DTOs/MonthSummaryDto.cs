using System;

namespace API.DTOs;

public class MonthSummaryDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public int Count { get; set; }
    public decimal Total { get; set; }
}
