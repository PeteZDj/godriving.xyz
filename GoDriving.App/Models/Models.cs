using System.Text.Json;
using System.Text.Json.Serialization;

namespace GoDriving.App.Models;

// Mirrors the GoDriving API JSON (Express + PostgreSQL behind IIS, :3009).
// Auth is Bearer-token based (localStorage 'godriving_token' on web).

public class User
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = "student";
    public string? Country { get; set; }
    public string? City { get; set; }
    public int Xp { get; set; }
    public int Coins { get; set; }
    public int Level { get; set; } = 1;
    public string? Avatar { get; set; }

    public string LocationText => string.Join(", ", new[] { City, Country }.Where(s => !string.IsNullOrWhiteSpace(s)));
}

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public User User { get; set; } = new();
}

public class MeResponse { public User? User { get; set; } }

public class PublicStats
{
    public int Learners { get; set; }
    public int Schools { get; set; }
    public int GamesPlayed { get; set; }
}

public class LeaderboardEntry
{
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Country { get; set; }
    [JsonConverter(typeof(FlexibleIntConverter))] public int Score { get; set; }
    public int? Level { get; set; }

    public string LocationText => string.Join(", ", new[] { City, Country }.Where(s => !string.IsNullOrWhiteSpace(s)));
}

public class LeaderboardResponse { public List<LeaderboardEntry> Leaderboard { get; set; } = new(); }

public class School
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Country { get; set; }
    public string? City { get; set; }
    public string? Description { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? Logo { get; set; }
    [JsonConverter(typeof(FlexibleDoubleConverter))] public double Rating { get; set; }
    [JsonPropertyName("price_from")] public int? PriceFrom { get; set; }
    public bool Verified { get; set; }
    public bool Featured { get; set; }

    public string LocationText => string.Join(", ", new[] { City, Country }.Where(s => !string.IsNullOrWhiteSpace(s)));
    public string RatingText => Rating > 0 ? Rating.ToString("0.0") : "New";
    public string PriceText => PriceFrom is > 0 ? $"from {PriceFrom:N0} {CurrencyFor(Country)}" : "Contact for pricing";

    static string CurrencyFor(string? country) => country switch
    {
        "Kenya" => "KES",
        "Uganda" => "UGX",
        "Tanzania" => "TZS",
        "Rwanda" => "RWF",
        _ => "",
    };
}

public class SchoolsResponse { public List<School> Schools { get; set; } = new(); }
public class SchoolResponse { public School? School { get; set; } }

public class GameStat
{
    public string Game { get; set; } = string.Empty;
    [JsonConverter(typeof(FlexibleIntConverter))] public int Best { get; set; }
    [JsonConverter(typeof(FlexibleIntConverter))] public int Plays { get; set; }
    [JsonPropertyName("avg_accuracy")] public string? AvgAccuracy { get; set; }
}

public class MeStats
{
    public User? User { get; set; }
    public List<GameStat> Games { get; set; } = new();
    public int TotalPlays { get; set; }
    public int GlobalRank { get; set; }
}

// pg returns numeric/real columns as strings; accept string or number.
public class FlexibleIntConverter : JsonConverter<int>
{
    public override int Read(ref Utf8JsonReader r, Type t, JsonSerializerOptions o) => r.TokenType switch
    {
        JsonTokenType.Number => r.TryGetInt32(out var i) ? i : (int)r.GetDouble(),
        JsonTokenType.String => int.TryParse(r.GetString(), out var i) ? i : 0,
        _ => 0,
    };
    public override void Write(Utf8JsonWriter w, int v, JsonSerializerOptions o) => w.WriteNumberValue(v);
}

public class FlexibleDoubleConverter : JsonConverter<double>
{
    public override double Read(ref Utf8JsonReader r, Type t, JsonSerializerOptions o) => r.TokenType switch
    {
        JsonTokenType.Number => r.GetDouble(),
        JsonTokenType.String => double.TryParse(r.GetString(), out var d) ? d : 0,
        _ => 0,
    };
    public override void Write(Utf8JsonWriter w, double v, JsonSerializerOptions o) => w.WriteNumberValue(v);
}
