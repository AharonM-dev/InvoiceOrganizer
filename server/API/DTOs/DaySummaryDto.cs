using System;

namespace API.DTOs;

public class DaySummaryDto
{
    public DateOnly Date { get; set; }
    public int Count { get; set; }
    public decimal Total { get; set; }
}
