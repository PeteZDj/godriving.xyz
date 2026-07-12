using GoDriving.App.Models;
using GoDriving.App.Services;

namespace GoDriving.App.Pages;

// Directory of partner driving schools (live from the API).
public class SchoolsPage : ContentPage
{
    readonly ApiClient _api;
    readonly VerticalStackLayout _list;
    readonly ActivityIndicator _spinner;
    bool _loaded;

    public SchoolsPage(ApiClient api, AppState appState)
    {
        _api = api;
        Title = "Schools";
        BackgroundColor = Ui.Bg;

        var header = new VerticalStackLayout
        {
            BackgroundColor = Ui.Ink,
            Padding = new Thickness(20, 22, 20, 20),
            Spacing = 2,
            Children =
            {
                new Label { Text = "Driving Schools", FontSize = 24, FontAttributes = FontAttributes.Bold, TextColor = Colors.White },
                new Label { Text = "Trusted, NTSA-approved partners across Africa.", FontSize = 13, TextColor = Ui.SubInk },
            }
        };

        _spinner = new ActivityIndicator { Color = Ui.Brand, IsRunning = true, IsVisible = true, Margin = new Thickness(0, 24, 0, 0) };
        _list = new VerticalStackLayout { Spacing = 10, Padding = new Thickness(16) };

        Content = new ScrollView { Content = new VerticalStackLayout { Children = { header, _spinner, _list } } };
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
        var schools = await _api.GetSchoolsAsync();
        _spinner.IsRunning = _spinner.IsVisible = false;
        if (schools.Count == 0)
        {
            _list.Children.Add(Ui.Card(new Label { Text = "Couldn't load schools. Pull to retry from the web app.", FontSize = 14, TextColor = Ui.Muted }));
            return;
        }
        foreach (var s in schools) _list.Children.Add(SchoolRow(s));
    }

    View SchoolRow(School s)
    {
        var logo = new Frame
        {
            WidthRequest = 54, HeightRequest = 54, CornerRadius = 12, Padding = 0, IsClippedToBounds = true, HasShadow = false,
            BorderColor = Ui.Line, VerticalOptions = LayoutOptions.Center, BackgroundColor = Ui.Brand,
            Content = string.IsNullOrWhiteSpace(s.Logo)
                ? new Label { Text = Ui.Initials(s.Name), FontSize = 20, FontAttributes = FontAttributes.Bold, TextColor = Colors.White, HorizontalOptions = LayoutOptions.Center, VerticalOptions = LayoutOptions.Center }
                : Ui.RemoteImage(s.Logo, 54, 54),
        };

        var badges = new HorizontalStackLayout { Spacing = 6 };
        badges.Children.Add(Ui.Pill($"\u2605 {s.RatingText}", Ui.Amber.WithAlpha(0.16f), Color.FromArgb("#8a6d1a")));
        if (s.Verified) badges.Children.Add(Ui.Pill("Verified", Ui.Go.WithAlpha(0.16f), Color.FromArgb("#2f7a34")));
        if (s.Featured) badges.Children.Add(Ui.Pill("Featured", Ui.Brand.WithAlpha(0.14f), Ui.Brand));

        var mid = new VerticalStackLayout
        {
            Spacing = 3, VerticalOptions = LayoutOptions.Center,
            Children =
            {
                new Label { Text = s.Name, FontSize = 15, FontAttributes = FontAttributes.Bold, TextColor = Ui.InkText, MaxLines = 2, LineBreakMode = LineBreakMode.TailTruncation },
                new Label { Text = s.LocationText, FontSize = 12.5, TextColor = Ui.Muted },
                badges,
            }
        };

        var grid = new Grid
        {
            ColumnDefinitions = { new ColumnDefinition(GridLength.Auto), new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Auto) },
            ColumnSpacing = 14, Padding = new Thickness(4),
        };
        grid.Add(logo, 0, 0);
        grid.Add(mid, 1, 0);
        grid.Add(new Label { Text = "\u203A", FontSize = 22, TextColor = Ui.Muted, VerticalOptions = LayoutOptions.Center }, 2, 0);

        var card = Ui.Card(grid);
        var tap = new TapGestureRecognizer();
        tap.Tapped += async (_, _) => await Navigation.PushAsync(new SchoolDetailPage(s));
        card.GestureRecognizers.Add(tap);
        return card;
    }
}
