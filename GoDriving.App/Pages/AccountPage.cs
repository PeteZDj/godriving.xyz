using GoDriving.App.Models;
using GoDriving.App.Services;

namespace GoDriving.App.Pages;

// Signed-out: Google sign-in. Signed-in: profile, XP/level/coins, rank + bests.
public class AccountPage : ContentPage
{
    readonly ApiClient _api;
    readonly AppState _appState;
    readonly ActivityIndicator _spinner;

    public AccountPage(ApiClient api, AppState appState)
    {
        _api = api;
        _appState = appState;
        Title = "Account";
        BackgroundColor = Ui.Bg;
        _spinner = new ActivityIndicator { Color = Ui.Brand, IsVisible = false, HorizontalOptions = LayoutOptions.Center };
        Build();
        if (_appState.IsLoggedIn) _ = RefreshAsync();
    }

    void Build()
    {
        Content = new ScrollView { Content = _appState.IsLoggedIn ? SignedIn() : SignedOut() };
    }

    View SignedOut()
    {
        var googleBtn = Ui.PrimaryButton("Continue with Google");
        googleBtn.Clicked += OnGoogleClicked;

        var header = new VerticalStackLayout
        {
            BackgroundColor = Ui.Ink,
            Padding = new Thickness(24, 56, 24, 40),
            Spacing = 8,
            Children =
            {
                new Frame
                {
                    WidthRequest = 72, HeightRequest = 72, CornerRadius = 18, Padding = 0, HasShadow = false,
                    BackgroundColor = Ui.Brand, HorizontalOptions = LayoutOptions.Center,
                    Content = new Label { Text = "\U0001F697", FontSize = 34, HorizontalOptions = LayoutOptions.Center, VerticalOptions = LayoutOptions.Center },
                },
                new Label { Text = "Save your progress", FontSize = 22, FontAttributes = FontAttributes.Bold, TextColor = Colors.White, HorizontalTextAlignment = TextAlignment.Center },
                new Label { Text = "Sign in to earn XP & coins, level up and climb the leaderboard.", FontSize = 13, TextColor = Ui.SubInk, HorizontalTextAlignment = TextAlignment.Center },
            }
        };

        var card = Ui.Card(new VerticalStackLayout
        {
            Spacing = 14,
            Children =
            {
                _spinner,
                googleBtn,
                new Label { Text = "You can browse games, signs and schools without an account.", FontSize = 12, TextColor = Ui.Muted, HorizontalTextAlignment = TextAlignment.Center },
            }
        });

        return new VerticalStackLayout { Children = { header, new VerticalStackLayout { Padding = new Thickness(16), Children = { card } } } };
    }

    View SignedIn()
    {
        View avatar = !string.IsNullOrWhiteSpace(_appState.Avatar)
            ? new Frame { WidthRequest = 76, HeightRequest = 76, CornerRadius = 38, Padding = 0, IsClippedToBounds = true, HasShadow = false, HorizontalOptions = LayoutOptions.Center, Content = Ui.RemoteImage(_appState.Avatar, 76, 76) }
            : new Frame { WidthRequest = 76, HeightRequest = 76, CornerRadius = 38, Padding = 0, HasShadow = false, BackgroundColor = Ui.Brand, HorizontalOptions = LayoutOptions.Center,
                Content = new Label { Text = Ui.Initials(_appState.Name), FontSize = 30, FontAttributes = FontAttributes.Bold, TextColor = Colors.White, HorizontalOptions = LayoutOptions.Center, VerticalOptions = LayoutOptions.Center } };

        var header = new VerticalStackLayout
        {
            BackgroundColor = Ui.Ink,
            Padding = new Thickness(20, 44, 20, 24),
            Spacing = 6,
            Children =
            {
                avatar,
                new Label { Text = _appState.Name ?? "Driver", FontSize = 20, FontAttributes = FontAttributes.Bold, TextColor = Colors.White, HorizontalTextAlignment = TextAlignment.Center },
                new Label { Text = _appState.Email ?? "", FontSize = 13, TextColor = Ui.SubInk, HorizontalTextAlignment = TextAlignment.Center },
            }
        };

        var statsGrid = new Grid
        {
            ColumnDefinitions = { new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Star) },
            ColumnSpacing = 6,
        };
        statsGrid.Add(Ui.StatBlock($"Lvl {_appState.Level}", "Level", Ui.Brand), 0, 0);
        statsGrid.Add(Ui.StatBlock(_appState.Xp.ToString("N0"), "XP", Ui.Go), 1, 0);
        statsGrid.Add(Ui.StatBlock(_appState.Coins.ToString("N0"), "Coins", Ui.Amber), 2, 0);
        var statsCard = Ui.Card(statsGrid);

        _rankLabel = new Label { Text = "Global rank: —", FontSize = 14, FontAttributes = FontAttributes.Bold, TextColor = Ui.InkText };
        _bestsHost = new VerticalStackLayout { Spacing = 6 };
        var progressCard = Ui.Card(new VerticalStackLayout
        {
            Spacing = 10,
            Children =
            {
                new Label { Text = "MY DRIVING", FontSize = 12, FontAttributes = FontAttributes.Bold, TextColor = Ui.Muted, CharacterSpacing = 1 },
                _rankLabel,
                _bestsHost,
            }
        });

        var signOut = new Button
        {
            Text = "SIGN OUT", BackgroundColor = Colors.White, TextColor = Color.FromArgb("#DC2626"),
            BorderColor = Color.FromArgb("#F3C6C6"), BorderWidth = 1, FontAttributes = FontAttributes.Bold, CornerRadius = 26, HeightRequest = 50,
        };
        signOut.Clicked += OnSignOut;

        return new VerticalStackLayout
        {
            Children = { header, new VerticalStackLayout { Padding = new Thickness(16), Spacing = 14, Children = { _spinner, statsCard, progressCard, signOut } } }
        };
    }

    Label? _rankLabel;
    VerticalStackLayout? _bestsHost;

    async void OnGoogleClicked(object? sender, EventArgs e)
    {
        try
        {
            _spinner.IsVisible = _spinner.IsRunning = true;
            var auth = await GoogleSignIn.AuthenticateAsync();
            if (auth is null) return;
            _appState.SetSession(auth);
            Build();
            _ = RefreshAsync();
        }
        catch (TaskCanceledException) { }
        catch (Exception ex) { await DisplayAlertAsync("Sign-in failed", ex.Message, "OK"); }
        finally { _spinner.IsVisible = _spinner.IsRunning = false; }
    }

    async void OnSignOut(object? sender, EventArgs e)
    {
        var ok = await DisplayAlertAsync("Sign out", "Sign out of GoDriving on this device?", "Sign out", "Cancel");
        if (!ok) return;
        await _api.LogoutAsync();
        _appState.Clear();
        Build();
    }

    async Task RefreshAsync()
    {
        try
        {
            _spinner.IsVisible = _spinner.IsRunning = true;
            var stats = await _api.GetMyStatsAsync();
            if (stats?.User is not null)
            {
                _appState.ApplyUser(stats.User);
                Build();
                if (_rankLabel is not null) _rankLabel.Text = stats.GlobalRank > 0 ? $"Global rank: #{stats.GlobalRank}" : "Global rank: unranked";
                if (_bestsHost is not null)
                {
                    _bestsHost.Children.Clear();
                    if (stats.Games.Count == 0)
                        _bestsHost.Children.Add(new Label { Text = "Play a game to record your first score.", FontSize = 12.5, TextColor = Ui.Muted });
                    foreach (var gs in stats.Games)
                        _bestsHost.Children.Add(BestRow(gs));
                }
            }
        }
        catch { }
        finally { _spinner.IsVisible = _spinner.IsRunning = false; }
    }

    View BestRow(GameStat gs)
    {
        var lesson = Catalog.Lessons.FirstOrDefault(l => l.Id == gs.Game);
        var title = lesson?.Title ?? gs.Game;
        var g = new Grid { ColumnDefinitions = { new ColumnDefinition(GridLength.Auto), new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Auto) }, ColumnSpacing = 10 };
        g.Add(new Label { Text = lesson?.Emoji ?? "\U0001F3C1", FontSize = 18, VerticalOptions = LayoutOptions.Center }, 0, 0);
        g.Add(new Label { Text = title, FontSize = 13.5, TextColor = Ui.InkText, VerticalOptions = LayoutOptions.Center }, 1, 0);
        g.Add(new Label { Text = $"Best {gs.Best:N0} · {gs.Plays} plays", FontSize = 12, FontAttributes = FontAttributes.Bold, TextColor = Ui.Brand, VerticalOptions = LayoutOptions.Center }, 2, 0);
        return g;
    }
}
