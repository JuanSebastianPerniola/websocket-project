using GrpcService1.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Server.Kestrel.Core;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
	options.ConfigureEndpointDefaults(endpointOptions =>
	{
		endpointOptions.Protocols = HttpProtocols.Http1;
	});
});

// Add services to the container.
builder.Services.AddGrpc();
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
{
	options.AddPolicy("react-dev", policy =>
		policy.WithOrigins("http://localhost:5173")
			.AllowAnyHeader()
			.AllowAnyMethod()
			.AllowCredentials());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseCors("react-dev");
app.MapGet("/", () => "Communication with gRPC endpoints must be made through a gRPC client. To learn how to create a gRPC client, visit: https://go.microsoft.com/fwlink/?linkid=2086909");
app.MapHub<MarketHub>("/marketHub").RequireCors("react-dev");
app.MapPost("/api/market", async (MarketUpdate update, IHubContext<MarketHub> hubContext) =>
{
	await hubContext.Clients.All.SendAsync("ReceiveUpdate", update);
	return Results.Ok();
}).RequireCors("react-dev");

app.Run();

public sealed record MarketUpdate(string Symbol, decimal Price, decimal Quantity, DateTimeOffset Time);
