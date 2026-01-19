using API.Data;
using API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SuppliersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Supplier>>> Get() =>
        await db.Suppliers.AsNoTracking().OrderBy(s => s.Name).ToListAsync();

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Supplier>> GetOne(int id)
    {
        var s = await db.Suppliers.Include(x => x.Invoices).FirstOrDefaultAsync(x => x.Id == id);
        return s is null ? NotFound() : s;
    }

    [HttpPost]
    public async Task<ActionResult<Supplier>> Create(Supplier dto)
    {
        db.Suppliers.Add(dto);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetOne), new { id = dto.Id }, dto);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Supplier dto)
    {
        if (id != dto.Id) return BadRequest();
        db.Entry(dto).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var s = await db.Suppliers.FindAsync(id);
        if (s is null) return NotFound();
        db.Suppliers.Remove(s);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
