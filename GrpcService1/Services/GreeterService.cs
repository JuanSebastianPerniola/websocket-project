using Microsoft.AspNetCore.SignalR;
using Hub = Microsoft.AspNetCore.SignalR.Hub;
namespace GrpcService1.Services;

public class MarketHub : Hub
{
    public async Task SendUpdate(string data)
    {
        await Clients.All.SendAsync("ReceiveUpdate", data);
    }
}
