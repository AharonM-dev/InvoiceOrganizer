using System;
using API.Data;
using API.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;
using API.DTOs;
using Microsoft.EntityFrameworkCore;
using API.Interfaces;
using API.Extensions;
namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccountController(AppDbContext context, ITokenService tokenService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<UserDto>> Register(RegisterDTO registerDTO)
    {
        if (await EmailExists(registerDTO.Email))
            return BadRequest("Email is already in use");
        using var hmac = new HMACSHA512();
        var user = new Users
        {
            Username = registerDTO.Username,
            Email = registerDTO.Email,
            PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(registerDTO.Password)),
            PasswordSalt = hmac.Key,
            IsAdmin = false
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.ToDto(tokenService);
    }
    [HttpPost("login")]
    public async Task<ActionResult<UserDto>> Login(LoginDto loginDto)
    {
        var user = await context.Users.SingleOrDefaultAsync(x => x.Email == loginDto.Email);
        if (user == null) return Unauthorized("Invalid email");

        using var hmac = new HMACSHA512(user.PasswordSalt);
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(loginDto.Password));
        for (int i = 0; i < computedHash.Length; i++)
        {
            if (computedHash[i] != user.PasswordHash[i]) return Unauthorized("Invalid password");
        }
        return user.ToDto(tokenService);

    }
    private async Task<bool> EmailExists(string email)
    {
        return await context.Users.AnyAsync(x => x.Email.ToLower() == email.ToLower());
    }

    /// <summary>
    /// Returns the authenticated user's profile (id, username, email).
    /// These are the only fields the Users entity actually carries.
    /// </summary>
    [Authorize]
    [HttpGet("profile")]
    public async Task<ActionResult<ProfileDto>> GetProfile()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        var user = await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return NotFound();

        return new ProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email
        };
    }

    /// <summary>
    /// Updates the authenticated user's `Username`. Email is the login key
    /// and is intentionally not changeable here; that would require its own
    /// flow (uniqueness check, re-issued token).
    /// </summary>
    [Authorize]
    [HttpPut("profile")]
    public async Task<ActionResult<ProfileDto>> UpdateProfile(UpdateProfileRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();

        var newUsername = (req.Username ?? string.Empty).Trim();
        if (newUsername.Length == 0)
            return BadRequest(new { message = "Username is required" });

        user.Username = newUsername;
        await context.SaveChangesAsync();

        return new ProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email
        };
    }
}

