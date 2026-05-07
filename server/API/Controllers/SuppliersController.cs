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
public class SuppliersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Supplier>>> Get()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return await db.Suppliers.AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.Name)
            .ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Supplier>> GetOne(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var s = await db.Suppliers
            .Include(x => x.Invoices)
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        return s is null ? NotFound() : s;
    }

    [HttpPost]
    public async Task<ActionResult<Supplier>> Create(CreateSupplierRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var supplier = new Supplier
        {
            Name          = req.Name,
            SupNum        = req.SupNum,
            ContactEmail  = req.ContactEmail,
            PhoneNumber   = req.PhoneNumber,
            Address       = req.Address,
            UserId        = userId   // set only from JWT — never from client input
        };

        db.Suppliers.Add(supplier);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetOne), new { id = supplier.Id }, supplier);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Supplier dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (id != dto.Id) return BadRequest();

        var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (supplier is null) return NotFound();

        supplier.Name = dto.Name;
        supplier.SupNum = dto.SupNum;
        supplier.ContactEmail = dto.ContactEmail;
        supplier.PhoneNumber = dto.PhoneNumber;
        supplier.Address = dto.Address;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var s = await db.Suppliers.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        if (s is null) return NotFound();
        db.Suppliers.Remove(s);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
