using System;
using Microsoft.EntityFrameworkCore;
using API.Entities;

namespace API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext>options) : base(options)
    {
    }
    public DbSet<Supplier> Suppliers { set; get; }
    public DbSet<Invoice> Invoices { set; get; }
    public DbSet<InvoiceItem> InvoiceItems { set; get; } 
    public DbSet<Category> Categories { set; get; }
    public DbSet<Users> Users { set; get; }
}
