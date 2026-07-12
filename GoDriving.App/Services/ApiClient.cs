using System.Net.Http.Headers;
using System.Net.Http.Json;
using GoDriving.App.Models;

namespace GoDriving.App.Services;

// Typed client for the GoDriving API (Express + PostgreSQL behind IIS, proxied
// to the local godriving-api service on :3009). Bearer-token auth.
public class ApiClient
{
    private readonly HttpClient _http;
    private readonly AppState _appState;

    public const string BaseUrl = "https://godriving.xyz/api";
    public const string Origin  = "https://godriving.xyz";

    public ApiClient(AppState appState)
    {
        _appState = appState;
        _http = new HttpClient { BaseAddress = new Uri(BaseUrl + "/"), Timeout = TimeSpan.FromSeconds(25) };
    }

    private void ApplyAuthHeader()
    {
        _http.DefaultRequestHeaders.Authorization = string.IsNullOrEmpty(_appState.Token)
            ? null
            : new AuthenticationHeaderValue("Bearer", _appState.Token);
    }

    public async Task<User?> GetMeAsync()
    {
        ApplyAuthHeader();
        var resp = await _http.GetAsync("auth/me");
        if (!resp.IsSuccessStatusCode) return null;
        return (await resp.Content.ReadFromJsonAsync<MeResponse>())?.User;
    }

    public async Task LogoutAsync()
    {
        ApplyAuthHeader();
        try { await _http.PostAsync("auth/logout", null); } catch { /* best effort */ }
    }

    public async Task<PublicStats?> GetStatsAsync()
    {
        try { return await _http.GetFromJsonAsync<PublicStats>("stats"); }
        catch { return null; }
    }

    public async Task<List<LeaderboardEntry>> GetLeaderboardAsync()
    {
        try
        {
            var r = await _http.GetFromJsonAsync<LeaderboardResponse>("leaderboard");
            return r?.Leaderboard ?? new();
        }
        catch { return new(); }
    }

    public async Task<List<School>> GetSchoolsAsync()
    {
        try
        {
            var r = await _http.GetFromJsonAsync<SchoolsResponse>("schools");
            return r?.Schools ?? new();
        }
        catch { return new(); }
    }

    public async Task<MeStats?> GetMyStatsAsync()
    {
        ApplyAuthHeader();
        var resp = await _http.GetAsync("me/stats");
        if (!resp.IsSuccessStatusCode) return null;
        return await resp.Content.ReadFromJsonAsync<MeStats>();
    }
}
