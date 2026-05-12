using System.ComponentModel.DataAnnotations;

namespace API.DTOs;

public class CreateCategoryRequest
{
    [Required]
    [MinLength(2)]
    [MaxLength(60)]
    public string Name { get; set; } = string.Empty;
}
