using System;
using System.ComponentModel.DataAnnotations;
namespace API.DTOs;

public class RegisterDTO
{
    [Required]
    public string Username { get; set; } = "";
    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";
    [Required]
    [MinLength(6)]
    public string Password { get; set; } = "";
}
