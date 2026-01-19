using API.Data;
using API.DTOs;
using API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;


namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InvoicesController(AppDbContext db) : ControllerBase
{
    private readonly AppDbContext db = db;
    private const int MaxPageSize = 200; // מגן על השרת

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Invoice>>> Get(
        [FromQuery] int? supplierId,
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate
    )
    {
        var q = db.Invoices.AsNoTracking().Include(i => i.Supplier).AsQueryable();
        if (supplierId.HasValue)
            q = q.Where(i => i.SupplierId == supplierId.Value);

        if (fromDate.HasValue)
            q = q.Where(i => i.InvoiceDate >= fromDate.Value);

        if (toDate.HasValue)
            q = q.Where(i => i.InvoiceDate <= toDate.Value);

        q = q.OrderByDescending(i => i.InvoiceDate);

        return await q.ToListAsync();
    }
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Invoice>> GetOne(int id)
    {
        var invoice = await db.Invoices
            .Include(i => i.Items)
            .Include(i => i.Supplier)
            .Include(i => i.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == id);

        return invoice is null ? NotFound() : invoice;
    }
    [HttpPost]
    public async Task<ActionResult<Invoice>> Create(Invoice dto)
    {
        // לוודא שיש אוסף Items
        dto.Items ??= new List<InvoiceItem>();

        // מונעים בלגן במספור מזהים שמגיעים מהקליינט
        dto.Id = 0;
        foreach (var item in dto.Items)
        {
            item.Id = 0;
            // אפשר לאפשר ל-EF לקשר אוטומטית דרך ה-Items
            // item.InvoiceId לא חובה למלא ידנית כאן
        }

        // חישוב Total בצד השרת
        dto.ReCalculateTotal();

        db.Invoices.Add(dto);
        await db.SaveChangesAsync();

        // נחזיר 201 + Location ל-GetOne
        return CreatedAtAction(nameof(GetOne), new { id = dto.Id }, dto);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Invoice dto)
    {
        if (id != dto.Id)
            return BadRequest("Id ב-URL לא תואם ל-Id בגוף הבקשה");

        var invoice = await db.Invoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice is null)
            return NotFound();

        // עדכון שדות בסיסיים
        invoice.InvoiceNumber = dto.InvoiceNumber;
        invoice.InvoiceDate   = dto.InvoiceDate;
        invoice.FilePath      = dto.FilePath;
        invoice.SupplierId    = dto.SupplierId;
        invoice.UserId        = dto.UserId;

        // עדכון Items בצורה פשוטה: מוחקים ומכניסים מחדש
        invoice.Items.Clear();
        if (dto.Items is not null)
        {
            foreach (var item in dto.Items)
            {
                invoice.Items.Add(new InvoiceItem
                {
                    Name       = item.Name,
                    Price      = item.Price,
                    Quantity   = item.Quantity,
                    CategoryId = item.CategoryId
                    // InvoiceId יתמלא אוטומטית ע"י EF לפי הניווט
                });
            }
        }

        // חישוב Total מחדש
        invoice.ReCalculateTotal();

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var invoice = await db.Invoices.FindAsync(id);
        if (invoice is null)
            return NotFound();

        db.Invoices.Remove(invoice);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{summary}")]
    public async Task<ActionResult<IEnumerable<MonthSummaryDto>>> SummaryByYear(
        [FromQuery, Range(1, 9999)] int year,
        [FromQuery] int? supplierId
    )
    {
        var start = new DateOnly(year, 1, 1);
        var end = start.AddYears(1);
        var q = db.Invoices.AsNoTracking().Where(i => i.InvoiceDate >= start && i.InvoiceDate < end);
        if (supplierId.HasValue)
            q = q.Where(i => i.SupplierId == supplierId.Value);
        var data = await q
            .GroupBy(i => new { i.InvoiceDate.Year, i.InvoiceDate.Month })
            .Select(g => new MonthSummaryDto
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                Count = g.Count(),
                Total = g.Sum(i => i.Total)
            })
            .OrderBy(ms => ms.Month)
            .ToListAsync();
        return Ok(data);
    }

    [HttpGet("summary/by-supplier")]
    public async Task<ActionResult<IEnumerable<SupplierSummaryDto>>> SummaryBySupplier(
        [FromQuery, Range(1, 9999)] int year,
        [FromQuery, Range(1, 12)] int month
    )
    {
        var start = new DateOnly(year, month, 1);
        var end = start.AddMonths(1);

        var q = db.Invoices.AsNoTracking().Where(i => i.InvoiceDate >= start && i.InvoiceDate < end);
        var data = await q
            .GroupBy(i => i.SupplierId)
            .Select(g => new SupplierSummaryDto
            {
                SupplierId = g.Key,
                Count = g.Count(),
                Total = g.Sum(i => i.Total)
            })
            .OrderByDescending(ss => ss.Total)
            .ToListAsync();
        return Ok(data);

    }

    [HttpGet("summary/by-category")]
    public async Task<ActionResult<IEnumerable<CategorySummaryDto>>> SummaryByCategory(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int? supplierId
        )
    {
        DateOnly? start = null, end = null;
        if (year.HasValue && month.HasValue)
        {
            start = new DateOnly(year.Value, month.Value, 1);
            end = start.Value.AddMonths(1);
        }
        else if (year.HasValue)
        {
            start = new DateOnly(year.Value, 1, 1);
            end = start.Value.AddYears(1);
        }
        else if (from.HasValue || to.HasValue)
        {
            if (from.HasValue) start = from.Value;
            if (to.HasValue) end = to.Value;
        }
        var q = db.InvoiceItems.AsNoTracking().AsQueryable();

        if (supplierId.HasValue)
            q = q.Where(ii => ii.Invoice.SupplierId == supplierId.Value);

        if (start.HasValue)
            q = q.Where(ii => ii.Invoice.InvoiceDate >= start.Value);
        if (end.HasValue)
            q = q.Where(ii => ii.Invoice.InvoiceDate < end.Value);

        var data = await db.InvoiceItems.AsNoTracking()
            .Where(ii => q.Select(i => i.Id).Contains(ii.InvoiceId))
            .GroupBy(ii => new { ii.CategoryId, CategoryName = ii.Category.Name })
            .Select(g => new CategorySummaryDto
            {
                CategoryId = g.Key.CategoryId,
                CategoryName = g.Key.CategoryName,
                Count = g.Count(),
                Total = g.Sum(x => x.Price * x.Quantity)
            })
            .OrderByDescending(x => x.Total)
            .ToListAsync();
        return Ok(data);
    }

    [HttpGet("summary/by-year")]
    public async Task<ActionResult<IEnumerable<YearSummaryDto>>> SummaryByYearRange(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to
        )
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var defaultStart = new DateOnly(today.Year - 4, 1, 1); // 5

        var start = from ?? defaultStart;
        var end = to ?? start.AddYears(5);
        var q = db.Invoices.AsNoTracking()
            .Where(i => i.InvoiceDate >= start && i.InvoiceDate < end);
        var data = await q
            .GroupBy(i => i.InvoiceDate.Year)
            .Select(g => new YearSummaryDto
            {
                Year = g.Key,
                Count = g.Count(),
                Total = g.Sum(x => x.Total)
            }
            )
            .OrderBy(x => x.Year)
            .ToListAsync();
        return Ok(data);
    }
}


