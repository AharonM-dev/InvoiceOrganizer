using System;

namespace API.Entities;

public class Invoice
{
    public int Id { get; set; }
    public int InvoiceNumber { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public string? FilePath { get; set; }

    public int SupplierId { get; set; }
    public virtual Supplier Supplier { get; set; } = null!;

    public string UserId { get; set; } = string.Empty;
    public virtual Users User { get; set; } = null!;

    public virtual ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();

    public decimal Total {get; private set; }
    public void ReCalculateTotal()
    {
        Total = Items.Sum(i => i.Price * i.Quantity);
    }
}
