using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace API.Hubs
{
    [Authorize]
    public class OcrHub : Hub
    {
        public async Task JoinUserGroup()
        {
            var userId = Context.UserIdentifier;
            if (!string.IsNullOrEmpty(userId))
                await Groups.AddToGroupAsync(Context.ConnectionId, userId);
        }
    }
}
