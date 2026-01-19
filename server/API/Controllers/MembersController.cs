using API.Data;
using API.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
        public class MembersController(AppDbContext context) : ControllerBase
    {
        [HttpGet]
        public ActionResult<IReadOnlyList<Users>> GetMembers()
        {
            var users = context.Users.ToList();
            return Ok(users);
        }
        [Authorize]
        [HttpGet("{id}")]
        public ActionResult<Users> GetMembers(string id)
        {
            var user = context.Users.Find(id);
            if (user == null) return NotFound();
            return Ok(user);
        }
    }

}
