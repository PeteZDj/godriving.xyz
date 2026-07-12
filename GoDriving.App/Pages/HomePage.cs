using GoDriving.App.Models;
using GoDriving.App.Services;

namespace GoDriving.App.Pages;

// Landing: brand hero, live platform stats, the game catalog (play on web), and
// a leaderboard preview.
public class HomePage : ContentPage
{
    readonly ApiClient _api;
    readonly AppState _appState;
    readonly Grid _statsGrid;
    readonly VerticalStackLayout _leaderPreview;
    bool _loaded;

    public HomePage(ApiClient api, AppState appState)
    {
        _api = api;
        _appState = appState;
        Title = "Play";
        BackgroundColor = Ui.Bg;

        // ── Hero ──
        var logo = new Frame
        {
            WidthRequest = 56, HeightRequest = 56, CornerRadius = 14, Padding = 0, HasShadow = false,
            BackgroundColor = Ui.Brand, HorizontalOptions = LayoutOptions.Start,
            Content = new Label { Text = "\U0001F697", FontSize = 28, HorizontalOptions = LayoutOptions.Center, VerticalOptions = LayoutOptions.Center },
        };
        var wordmark = new FormattedString();
        wordmark.Spans.Add(new Span { Text = "Go", TextColor = Colors.White, FontSize = 30, FontAttributes = FontAttributes.Bold });
        wordmark.Spans.Add(new Span { Text = "Driving", TextColor = Ui.Go, FontSize = 30, FontAttributes = FontAttributes.Bold });

        var hero = new VerticalStackLayout
        {
            BackgroundColor = Ui.Ink,
            Padding = new Thickness(22, 26, 22, 28),
            Spacing = 10,
            Children =
            {
                logo,
                new Label { FormattedText = wordmark },
                new Label { Text = Catalog.Tagline, FontSize = 14, TextColor = Ui.SubInk },
            }
        };

        // ── Stats strip ──
        _statsGrid = new Grid
        {
            ColumnDefinitions = { new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Star) },
            ColumnSpacing = 6,
        };
        _statsGrid.Add(Ui.StatBlock("—", "Learners", Ui.Brand), 0, 0);
        _statsGrid.Add(Ui.StatBlock("—", "Schools", Ui.Go), 1, 0);
        _statsGrid.Add(Ui.StatBlock("—", "Games played", Ui.Amber), 2, 0);
        var statsCard = Ui.Card(_statsGrid, new Thickness(16, -22, 16, 0));

        // ── Games ──
        var games = new VerticalStackLayout { Spacing = 12, Padding = new Thickness(16, 16, 16, 0) };
        games.Children.Add(new Label { Text = "DRIVING GAMES", FontSize = 12, FontAttributes = FontAttributes.Bold, TextColor = Ui.Muted, CharacterSpacing = 2 });
        foreach (var lesson in Catalog.Lessons)
            games.Children.Add(GameCard(lesson));

        // ── Leaderboard preview ──
        _leaderPreview = new VerticalStackLayout { Spacing = 8, Padding = new Thickness(16, 18, 16, 0) };
        var lbHeader = new Grid { ColumnDefinitions = { new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Auto) } };
        lbHeader.Add(new Label { Text = "TOP DRIVERS", FontSize = 12, FontAttributes = FontAttributes.Bold, TextColor = Ui.Muted, CharacterSpacing = 2, VerticalOptions = LayoutOptions.Center }, 0, 0);
        var viewAll = new Label { Text = "View all \u203A", FontSize = 13, TextColor = Ui.Brand, FontAttributes = FontAttributes.Bold, VerticalOptions = LayoutOptions.Center };
        var tap = new TapGestureRecognizer();
        tap.Tapped += async (_, _) => await Navigation.PushAsync(new LeaderboardPage(_api));
        viewAll.GestureRecognizers.Add(tap);
        lbHeader.Add(viewAll, 1, 0);
        _leaderPreview.Children.Add(lbHeader);

        var footNote = new Label
        {
            Text = "Games play best full-screen on godriving.xyz. Sign in to save XP, coins and climb the leaderboard.",
            FontSize = 12, TextColor = Ui.Muted, HorizontalTextAlignment = TextAlignment.Center,
            Margin = new Thickness(24, 18, 24, 26),
        };

        Content = new ScrollView
        {
            Content = new VerticalStackLayout { Children = { hero, statsCard, games, _leaderPreview, footNote } }
        };
    }

    protected override void OnAppearing()
    {
        base.OnAppearing();
        if (_loaded) return;
        _loaded = true;
        _ = LoadAsync();
    }

    async Task LoadAsync()
    {
        var statsTask = _api.GetStatsAsync();
        var lbTask = _api.GetLeaderboardAsync();
        await Task.WhenAll(statsTask, lbTask);

        var stats = statsTask.Result;
        if (stats is not null)
        {
            _statsGrid.Clear();
            _statsGrid.Add(Ui.StatBlock(stats.Learners.ToString("N0"), "Learners", Ui.Brand), 0, 0);
            _statsGrid.Add(Ui.StatBlock(stats.Schools.ToString("N0"), "Schools", Ui.Go), 1, 0);
            _statsGrid.Add(Ui.StatBlock(stats.GamesPlayed.ToString("N0"), "Games played", Ui.Amber), 2, 0);
        }

        var lb = lbTask.Result;
        int rank = 1;
        foreach (var e in lb.Take(5))
            _leaderPreview.Children.Add(LeaderRow(rank++, e));
        if (lb.Count == 0)
            _leaderPreview.Children.Add(new Label { Text = "Be the first on the leaderboard!", FontSize = 13, TextColor = Ui.Muted });
    }

    View GameCard(Lesson lesson)
    {
        var accent = Color.FromArgb(lesson.Accent);
        var icon = new Frame
        {
            WidthRequest = 48, HeightRequest = 48, CornerRadius = 12, Padding = 0, HasShadow = false,
            BackgroundColor = accent.WithAlpha(0.15f), VerticalOptions = LayoutOptions.Center,
            Content = new Label { Text = lesson.Emoji, FontSize = 24, HorizontalOptions = LayoutOptions.Center, VerticalOptions = LayoutOptions.Center },
        };
        var mid = new VerticalStackLayout
        {
            Spacing = 3, VerticalOptions = LayoutOptions.Center,
            Children =
            {
                new Label { Text = lesson.Title, FontSize = 15, FontAttributes = FontAttributes.Bold, TextColor = Ui.InkText },
                new Label { Text = lesson.Short, FontSize = 12.5, TextColor = Ui.Muted },
                Ui.Pill(lesson.Tag, accent.WithAlpha(0.14f), accent),
            }
        };
        var grid = new Grid { ColumnDefinitions = { new ColumnDefinition(GridLength.Auto), new ColumnDefinition(GridLength.Star) }, ColumnSpacing = 14, Padding = new Thickness(4) };
        grid.Add(icon, 0, 0);
        grid.Add(mid, 1, 0);

        var card = Ui.Card(grid);
        var tap = new TapGestureRecognizer();
        tap.Tapped += async (_, _) =>
        {
            try { await Launcher.Default.OpenAsync(new Uri($"{ApiClient.Origin}/games/{lesson.Slug}")); } catch { }
        };
        card.GestureRecognizers.Add(tap);
        return card;
    }

    View LeaderRow(int rank, LeaderboardEntry e)
    {
        var rankColor = rank == 1 ? Ui.Amber : rank == 2 ? Color.FromArgb("#9CA3AF") : rank == 3 ? Color.FromArgb("#B45309") : Ui.Muted;
        var g = new Grid
        {
            ColumnDefinitions = { new ColumnDefinition(new GridLength(34)), new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Auto) },
            ColumnSpacing = 10, Padding = new Thickness(4),
        };
        g.Add(new Label { Text = rank.ToString(), FontSize = 17, FontAttributes = FontAttributes.Bold, TextColor = rankColor, VerticalOptions = LayoutOptions.Center, HorizontalTextAlignment = TextAlignment.Center }, 0, 0);
        g.Add(new VerticalStackLayout
        {
            Spacing = 1, VerticalOptions = LayoutOptions.Center,
            Children =
            {
                new Label { Text = string.IsNullOrWhiteSpace(e.Name) ? "Driver" : e.Name, FontSize = 14, FontAttributes = FontAttributes.Bold, TextColor = Ui.InkText },
                new Label { Text = string.IsNullOrWhiteSpace(e.LocationText) ? "\u2014" : e.LocationText, FontSize = 11.5, TextColor = Ui.Muted },
            }
        }, 1, 0);
        g.Add(new Label { Text = $"{e.Score:N0} XP", FontSize = 13, FontAttributes = FontAttributes.Bold, TextColor = Ui.Brand, VerticalOptions = LayoutOptions.Center }, 2, 0);
        return Ui.Card(g);
    }
}
