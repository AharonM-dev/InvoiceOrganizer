using API.Data;
using API.Entities;
using API.Services;
using API.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace API.Services
{
    public class OcrWorker : BackgroundService
    {
        private readonly IBackgroundTaskQueue _taskQueue;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<OcrWorker> _logger;
        private readonly IHubContext<OcrHub> _hubContext;

        public OcrWorker(
            IBackgroundTaskQueue taskQueue,
            IServiceScopeFactory scopeFactory,
            ILogger<OcrWorker> logger,
            IHubContext<OcrHub> hubContext)
        {
            _taskQueue = taskQueue;
            _scopeFactory = scopeFactory;
            _logger = logger;
            _hubContext = hubContext;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("OCR Background Worker is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                var workItem = await _taskQueue.DequeueAsync(stoppingToken);

                try
                {
                    await workItem(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred executing background work item.");
                }
            }
        }

        // פונקציית עזר לביצוע העיבוד המלא - ניתן לקרוא לה מה-Controller
        public async Task ProcessDocumentAsync(int documentId, CancellationToken ct)
        {
            using (var scope = _scopeFactory.CreateScope())
            {
                var _context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var _ocrEngine = scope.ServiceProvider.GetRequiredService<IOcrEngine>();
                var _env = scope.ServiceProvider.GetRequiredService<IWebHostEnvironment>();

                // 1. שליפת המסמך
                var doc = await _context.UploadedDocuments
                    .FirstOrDefaultAsync(d => d.Id == documentId, ct);

                if (doc == null) return;

                try 
                {
                    // 2. הרצת ה-OCR
                    var webRootPath = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
                    var fullPath = Path.Combine(webRootPath, doc.FilePath);
                    
                    var extracted = await _ocrEngine.ExtractInvoiceDataAsync(fullPath, doc.Id);

                    // 3. זיהוי ספק אוטומטי (לפי SupNum)
                    var supplier = await _context.Suppliers
                        .FirstOrDefaultAsync(s => s.SupNum == extracted.SupplierSupNum && s.UserId == doc.UserId, ct);

                    if (supplier == null)
                    {
                        _logger.LogInformation($"Supplier {extracted.SupplierSupNum} not found. Creating auto-generated supplier.");
                
                        supplier = new Supplier
                        {
                            Name = extracted.SupplierName ?? "ספק לא ידוע",
                            SupNum = extracted.SupplierSupNum ?? 0,
                            UserId = doc.UserId ?? string.Empty, // וודא שזה תואם להגדרות ה-Entity
                            Address = extracted.Address // אם ה-OCR מחלץ כתובת
                        };

                        _context.Suppliers.Add(supplier);
                        await _context.SaveChangesAsync(ct);
                    }

                    var category = await _context.Categories
                        .FirstOrDefaultAsync(c => c.Name == "כללי" && c.UserId == doc.UserId, ct);

                    if (category == null)
                    {
                        category = new Category { Name = "כללי", UserId = doc.UserId ?? string.Empty };
                        _context.Categories.Add(category);
                        await _context.SaveChangesAsync(ct);
                    }
                    // 4. יצירת חשבונית (Invoice)
                    var invoice = new Invoice
                    {
                        SupplierId = supplier.Id,
                        UserId = doc.UserId ?? string.Empty,
                        InvoiceNumber = extracted.InvoiceNumber ?? 0,
                        InvoiceDate = extracted.InvoiceDate ?? DateOnly.FromDateTime(DateTime.Now),
                        FilePath = doc.FilePath
                    };

                    // 5. הוספת פריטים
                    if (extracted.Items != null)
                    {
                        foreach (var item in extracted.Items)
                        {
                            invoice.Items.Add(new InvoiceItem
                            {
                                Name = item.Name ?? "פריט לא ידוע",
                                Price = item.Price,
                                Quantity = item.Quantity,
                                CategoryId = category.Id
                            });
                        }
                    }

                    invoice.ReCalculateTotal();
                    _context.Invoices.Add(invoice);
                    
                    doc.OcrStatus = "Success";
                    await _context.SaveChangesAsync(ct);
                    if (!string.IsNullOrEmpty(doc.UserId))
                    {
                        await _hubContext.Clients.Group(doc.UserId).SendAsync("OcrFinished", new 
                        { 
                            documentId = doc.Id, 
                            status = "Success",
                            invoiceId = invoice.Id 
                        }, ct);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Failed to process document {documentId}");
                    doc.OcrStatus = "Failed - OCR Error";
                    await _context.SaveChangesAsync(ct);
                    if (!string.IsNullOrEmpty(doc.UserId))
                    {
                        await _hubContext.Clients.Group(doc.UserId).SendAsync("OcrFinished", new 
                        { 
                            documentId = doc.Id, 
                            status = "Success",
                             
                        }, ct);
                    }
                }
            }
        }
    }
}