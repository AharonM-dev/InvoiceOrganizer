using System;

namespace API.Entities;

public class Supplier
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SupNum { get; set; }
    public string? ContactEmail { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public int UserId { get; set; }
    public virtual Users User { get; set; } = new();

}
