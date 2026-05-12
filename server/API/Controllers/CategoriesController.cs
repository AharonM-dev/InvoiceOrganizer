using API.Data;
using API.DTOs;
using API.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CategoriesController(AppDbContext db) : ControllerBase
{
    private static CategoryDto ToDto(Category c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        IsGlobal = string.IsNullOrEmpty(c.UserId),
    };

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> Get()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var items = await db.Categories.AsNoTracking()
            .Where(c => c.UserId == userId || c.UserId == "")
            .OrderBy(c => c.Name)
            .ToListAsync();
        return items.Select(ToDto).ToList();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CategoryDto>> GetOne(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var c = await db.Categories.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && (x.UserId == userId || x.UserId == ""));
        return c is null ? NotFound() : ToDto(c);
    }

    [HttpPost]
    public async Task<ActionResult<CategoryDto>> Create(CreateCategoryRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var name = req.Name.Trim();
        var normalized = name.ToLowerInvariant();

        var exists = await db.Categories.AnyAsync(c =>
            (c.UserId == userId || c.UserId == "") &&
            c.Name.ToLower() == normalized);
        if (exists)
            return Conflict(new { message = "קטגוריה בשם זה כבר קיימת." });

        var category = new Category { Name = name, UserId = userId };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetOne), new { id = category.Id }, ToDto(category));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, CreateCategoryRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var c = await db.Categories.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        if (c is null) return NotFound();

        var name = req.Name.Trim();
        var normalized = name.ToLowerInvariant();

        var dup = await db.Categories.AnyAsync(x =>
            x.Id != id &&
            (x.UserId == userId || x.UserId == "") &&
            x.Name.ToLower() == normalized);
        if (dup)
            return Conflict(new { message = "קטגוריה בשם זה כבר קיימת." });

        c.Name = name;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var c = await db.Categories.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        if (c is null) return NotFound();

        var inUse = await db.InvoiceItems.AnyAsync(ii => ii.CategoryId == id);
        if (inUse)
            return Conflict(new { message = "לא ניתן למחוק קטגוריה שכבר משויכת לפריטי חשבונית." });

        db.Categories.Remove(c);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
