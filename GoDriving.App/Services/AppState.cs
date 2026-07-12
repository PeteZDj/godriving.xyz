using GoDriving.App.Models;

namespace GoDriving.App.Services;

// Session store backed by MAUI Preferences (survives app restarts).
public class AppState
{
    public string? Token { get; private set; }
    public string? UserId { get; private set; }
    public string? Name { get; private set; }
    public string? Email { get; private set; }
    public string? Avatar { get; private set; }
    public string Role { get; private set; } = "student";
    public int Xp { get; private set; }
    public int Coins { get; private set; }
    public int Level { get; private set; } = 1;
    public string? City { get; private set; }
    public string? Country { get; private set; }

    public bool IsLoggedIn => !string.IsNullOrEmpty(Token);
    public string LocationText => string.Join(", ", new[] { City, Country }.Where(s => !string.IsNullOrWhiteSpace(s)));

    public AppState()
    {
        Token  = Preferences.Get(nameof(Token), null);
        UserId = Preferences.Get(nameof(UserId), null);
        Name   = Preferences.Get(nameof(Name), null);
        Email  = Preferences.Get(nameof(Email), null);
        Avatar = Preferences.Get(nameof(Avatar), null);
        Role   = Preferences.Get(nameof(Role), "student");
        Xp     = Preferences.Get(nameof(Xp), 0);
        Coins  = Preferences.Get(nameof(Coins), 0);
        Level  = Preferences.Get(nameof(Level), 1);
        City   = Preferences.Get(nameof(City), null);
        Country = Preferences.Get(nameof(Country), null);
    }

    public void SetSession(AuthResponse auth)
    {
        Token = auth.Token;
        ApplyUser(auth.User);
        Preferences.Set(nameof(Token), Token);
    }

    public void ApplyUser(User u)
    {
        UserId  = u.Id.ToString();
        Name    = u.Name;
        Email   = u.Email;
        Avatar  = u.Avatar;
        Role    = string.IsNullOrEmpty(u.Role) ? "student" : u.Role;
        Xp      = u.Xp;
        Coins   = u.Coins;
        Level   = u.Level;
        City    = u.City;
        Country = u.Country;

        Preferences.Set(nameof(UserId), UserId ?? string.Empty);
        Preferences.Set(nameof(Name), Name ?? string.Empty);
        Preferences.Set(nameof(Email), Email ?? string.Empty);
        Preferences.Set(nameof(Avatar), Avatar ?? string.Empty);
        Preferences.Set(nameof(Role), Role);
        Preferences.Set(nameof(Xp), Xp);
        Preferences.Set(nameof(Coins), Coins);
        Preferences.Set(nameof(Level), Level);
        Preferences.Set(nameof(City), City ?? string.Empty);
        Preferences.Set(nameof(Country), Country ?? string.Empty);
    }

    public void Clear()
    {
        Token = UserId = Name = Email = Avatar = City = Country = null;
        Role = "student"; Xp = Coins = 0; Level = 1;
        Preferences.Clear();
    }
}
