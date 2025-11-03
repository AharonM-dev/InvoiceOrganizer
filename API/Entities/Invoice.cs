using System;

namespace API.Entities;

public class Invoice
{
    public int Id { get; set; }
    public int SupplierId { get; set; }
    public int InvoiceNumber { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public virtual Supplier Supplier { get; set; } = null!;
    public int UserId { get; set; }
    public virtual Users User { get; set; } = new();
}
