using System;

namespace API.DTOs;

public class WeekSummaryDto
{
    public DateOnly WeekStart { get; set; }
    public int Count { get; set; }
    public decimal Total { get; set; }
}
