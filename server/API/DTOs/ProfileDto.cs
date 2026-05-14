using System.ComponentModel.DataAnnotations;

namespace API.DTOs;

/// <summary>
/// Shape returned by GET /api/account/profile. Mirrors the fields that
/// actually live on the Users entity — no fabricated columns.
/// </summary>
public class ProfileDto
{
    public required string Id { get; set; }
    public required string Username { get; set; }
    public required string Email { get; set; }
    public decimal Budget { get; set; }
}

/// <summary>
/// PUT /api/account/profile payload. Only `Username` is updatable for
/// now; Email is the login key and is intentionally left read-only via
/// this endpoint.
/// </summary>
public class UpdateProfileRequest
{
    [Required]
    [MinLength(1)]
    public string Username { get; set; } = "";

    [Range(0, double.MaxValue)]
    public decimal Budget { get; set; } = 0;
}
