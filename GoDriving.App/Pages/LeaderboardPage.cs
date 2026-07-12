using GoDriving.App.Models;
using GoDriving.App.Services;

namespace GoDriving.App.Pages;

// Full global leaderboard (top 20 by XP).
public class LeaderboardPage : ContentPage
{
    readonly ApiClient _api;
    readonly VerticalStackLayout _list;
    readonly ActivityIndicator _spinner;

    public LeaderboardPage(ApiClient api)
    {
        _api = api;
        Title = "Leaderboard";
        BackgroundColor = Ui.Bg;

        _spinner = new ActivityIndicator { Color = Ui.Brand, IsRunning = true, IsVisible = true, Margin = new Thickness(0, 24, 0, 0) };
        _list = new VerticalStackLayout { Spacing = 8, Padding = new Thickness(16) };

        var header = new VerticalStackLayout
        {
            BackgroundColor = Ui.Ink,
            Padding = new Thickness(22, 22, 22, 22),
            Spacing = 2,
            Children =
            {
                new Label { Text = "\U0001F3C6 Top Drivers", FontSize = 24, FontAttributes = FontAttributes.Bold, TextColor = Colors.White },
                new Label { Text = "Earn XP by playing games and completing lessons.", FontSize = 13, TextColor = Ui.SubInk },
            }
        };

        Content = new ScrollView { Content = new VerticalStackLayout { Children = { header, _spinner, _list } } };
        _ = LoadAsync();
    }

    async Task LoadAsync()
    {
        var lb = await _api.GetLeaderboardAsync();
        _spinner.IsRunning = _spinner.IsVisible = false;
        if (lb.Count == 0)
        {
            _list.Children.Add(Ui.Card(new Label { Text = "No scores yet — be the first!", FontSize = 14, TextColor = Ui.Muted }));
            return;
        }
        int rank = 1;
        foreach (var e in lb) _list.Children.Add(Row(rank++, e));
    }

    View Row(int rank, LeaderboardEntry e)
    {
        var rankColor = rank == 1 ? Ui.Amber : rank == 2 ? Color.FromArgb("#9CA3AF") : rank == 3 ? Color.FromArgb("#B45309") : Ui.Muted;
        var g = new Grid
        {
            ColumnDefinitions = { new ColumnDefinition(new GridLength(38)), new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Auto) },
            ColumnSpacing = 10, Padding = new Thickness(4),
        };
        g.Add(new Label { Text = rank.ToString(), FontSize = 18, FontAttributes = FontAttributes.Bold, TextColor = rankColor, VerticalOptions = LayoutOptions.Center, HorizontalTextAlignment = TextAlignment.Center }, 0, 0);
        g.Add(new VerticalStackLayout
        {
            Spacing = 1, VerticalOptions = LayoutOptions.Center,
            Children =
            {
                new Label { Text = string.IsNullOrWhiteSpace(e.Name) ? "Driver" : e.Name, FontSize = 15, FontAttributes = FontAttributes.Bold, TextColor = Ui.InkText },
                new Label { Text = string.IsNullOrWhiteSpace(e.LocationText) ? "\u2014" : e.LocationText, FontSize = 12, TextColor = Ui.Muted },
            }
        }, 1, 0);
        g.Add(new VerticalStackLayout
        {
            VerticalOptions = LayoutOptions.Center, Spacing = 0, HorizontalOptions = LayoutOptions.End,
            Children =
            {
                new Label { Text = $"{e.Score:N0}", FontSize = 15, FontAttributes = FontAttributes.Bold, TextColor = Ui.Brand, HorizontalTextAlignment = TextAlignment.End },
                new Label { Text = e.Level is > 0 ? $"Lvl {e.Level}" : "XP", FontSize = 11, TextColor = Ui.Muted, HorizontalTextAlignment = TextAlignment.End },
            }
        }, 2, 0);
        return Ui.Card(g);
    }
}
