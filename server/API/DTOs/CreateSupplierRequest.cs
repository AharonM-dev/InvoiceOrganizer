using System.ComponentModel.DataAnnotations;

namespace API.DTOs;

/// <summary>
/// Request body for POST /api/suppliers.
/// Accepts only the fields the client is permitted to set.
/// Id, UserId, User, and Invoices are intentionally excluded.
/// </summary>
public class CreateSupplierRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public int SupNum { get; set; }

    [EmailAddress]
    public string? ContactEmail { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Address { get; set; }
}
