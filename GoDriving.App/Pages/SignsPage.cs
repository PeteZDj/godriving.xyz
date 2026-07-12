using GoDriving.App.Models;
using GoDriving.App.Services;

namespace GoDriving.App.Pages;

// Road-sign library with category filtering. Tap a sign for the full SVG + meaning.
public class SignsPage : ContentPage
{
    readonly VerticalStackLayout _list;
    readonly HorizontalStackLayout _filters;
    SignCategory? _active;

    public SignsPage(ApiClient api, AppState appState)
    {
        Title = "Signs";
        BackgroundColor = Ui.Bg;

        var header = new VerticalStackLayout
        {
            BackgroundColor = Ui.Ink,
            Padding = new Thickness(20, 22, 20, 20),
            Spacing = 2,
            Children =
            {
                new Label { Text = "Road Sign Library", FontSize = 24, FontAttributes = FontAttributes.Bold, TextColor = Colors.White },
                new Label { Text = $"{Catalog.Signs.Count} signs across regulatory, warning, mandatory & information.", FontSize = 13, TextColor = Ui.SubInk },
            }
        };

        _filters = new HorizontalStackLayout { Spacing = 8, Padding = new Thickness(16, 14, 16, 2) };
        var scrollFilters = new ScrollView { Orientation = ScrollOrientation.Horizontal, HorizontalScrollBarVisibility = ScrollBarVisibility.Never, Content = _filters };
        BuildFilters();

        _list = new VerticalStackLayout { Spacing = 10, Padding = new Thickness(16, 12, 16, 20) };
        BuildList();

        Content = new ScrollView { Content = new VerticalStackLayout { Children = { header, scrollFilters, _list } } };
    }

    void BuildFilters()
    {
        _filters.Children.Clear();
        _filters.Children.Add(FilterChip("All", null));
        foreach (SignCategory c in Enum.GetValues<SignCategory>())
            _filters.Children.Add(FilterChip(c.ToString(), c));
    }

    View FilterChip(string label, SignCategory? cat)
    {
        bool on = _active == cat;
        var color = cat is null ? Ui.Brand : Color.FromArgb(Catalog.CategoryColor(cat.Value));
        var frame = new Frame
        {
            BackgroundColor = on ? color : Colors.White,
            BorderColor = color,
            CornerRadius = 16,
            Padding = new Thickness(14, 7),
            HasShadow = false,
            Content = new Label { Text = label, FontSize = 13, FontAttributes = FontAttributes.Bold, TextColor = on ? Colors.White : color },
        };
        var tap = new TapGestureRecognizer();
        tap.Tapped += (_, _) => { _active = cat; BuildFilters(); BuildList(); };
        frame.GestureRecognizers.Add(tap);
        return frame;
    }

    void BuildList()
    {
        _list.Children.Clear();
        var signs = _active is null ? Catalog.Signs : Catalog.Signs.Where(s => s.Category == _active);
        foreach (var s in signs)
            _list.Children.Add(SignRow(s));
    }

    View SignRow(RoadSign s)
    {
        var catColor = Color.FromArgb(Catalog.CategoryColor(s.Category));
        var grid = new Grid
        {
            ColumnDefinitions = { new ColumnDefinition(GridLength.Auto), new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Auto) },
            ColumnSpacing = 14, Padding = new Thickness(4),
        };
        grid.Add(new Grid { WidthRequest = 52, HeightRequest = 52, VerticalOptions = LayoutOptions.Center, Children = { Ui.SignThumb(s) } }, 0, 0);
        grid.Add(new VerticalStackLayout
        {
            Spacing = 3, VerticalOptions = LayoutOptions.Center,
            Children =
            {
                new Label { Text = s.Name, FontSize = 15, FontAttributes = FontAttributes.Bold, TextColor = Ui.InkText },
                new Label { Text = s.Description, FontSize = 12, TextColor = Ui.Muted, MaxLines = 2, LineBreakMode = LineBreakMode.TailTruncation },
                Ui.Pill(s.Category.ToString(), catColor.WithAlpha(0.14f), catColor),
            }
        }, 1, 0);
        grid.Add(new Label { Text = "\u203A", FontSize = 22, TextColor = Ui.Muted, VerticalOptions = LayoutOptions.Center }, 2, 0);

        var card = Ui.Card(grid);
        var tap = new TapGestureRecognizer();
        tap.Tapped += async (_, _) => await Navigation.PushAsync(new SignDetailPage(s));
        card.GestureRecognizers.Add(tap);
        return card;
    }
}
