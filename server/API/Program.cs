using API.Data;
using API.Services;
using API.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using API.Services.DocumentAI;
using API.Hubs;
using API.Entities;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<AppDbContext>(opt =>
{
    opt.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection"));
});

builder.Services.Configure<AzureDocumentIntelligenceOptions>(
    builder.Configuration.GetSection("Azure:DocumentIntelligence"));
builder.Services.AddScoped<IInvoiceOcrService, AzureDocumentIntelligenceInvoiceParser>();
builder.Services.AddScoped<IOcrEngine, OcrEngine>();

builder.Services.AddControllers();

//builder.Services.AddEndpointsApiExplorer();
//builder.Services.AddSwaggerGen();

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var tokenKey = builder.Configuration["TokenKey"]
            ?? throw new Exception("TokenKey not found in configuration. Please set TokenKey in appsettings.json or as an environment variable.");
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(tokenKey)),
            ValidateIssuer = false,
            ValidateAudience = false
        };
    });

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
//builder.Services.AddOpenApi();
builder.Services.AddSingleton<IBackgroundTaskQueue>(ctx => new BackgroundTaskQueue(100));
builder.Services.AddSingleton<OcrWorker>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<OcrWorker>());

builder.Services.AddSignalR();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:4200") // הכתובת המדויקת של האנגולר
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // קריטי ל-SignalR!
    });
});

var app = builder.Build();

//if (app.Environment.IsDevelopment())
//{
//   
//}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    //app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(x => x.AllowAnyHeader().AllowAnyMethod().WithOrigins("http://localhost:4200").AllowCredentials());

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<OcrHub>("/hubs/ocr");


app.Run();
