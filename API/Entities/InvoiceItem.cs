using System;

namespace API.Entities;

public class InvoiceItem
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public int CategoryId { get; set; }
    public virtual Category Category { get; set; } = null!;
    public int InvoiceId { get; set; }
    public virtual Invoice Invoice { get; set; } = null!;

}
