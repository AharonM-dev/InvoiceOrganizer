using Microsoft.AspNetCore.SignalR;

namespace API.Hubs
{
    public class OcrHub : Hub
    {
        // ניתן להוסיף לוגיקה לשיוך משתמשים לקבוצות לפי UserId
        public async Task JoinUserGroup(string userId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);
        }
    }
}