using GoDriving.App.Models;

namespace GoDriving.App.Pages;

// Full sign rendering (exact SVG) + category and meaning.
public class SignDetailPage : ContentPage
{
    public SignDetailPage(RoadSign s)
    {
        Title = s.Name;
        BackgroundColor = Ui.Bg;

        var catColor = Color.FromArgb(Catalog.CategoryColor(s.Category));

        var signCard = Ui.Card(new VerticalStackLayout
        {
            Spacing = 14,
            Children =
            {
                new Frame
                {
                    BackgroundColor = Colors.White, CornerRadius = 12, HasShadow = false, BorderColor = Ui.Line,
                    Padding = new Thickness(6), Content = Ui.SvgView(s.Svg),
                },
                new Label { Text = s.Name, FontSize = 22, FontAttributes = FontAttributes.Bold, TextColor = Ui.InkText, HorizontalTextAlignment = TextAlignment.Center },
                new HorizontalStackLayout { HorizontalOptions = LayoutOptions.Center, Children = { Ui.Pill(s.Category.ToString(), catColor.WithAlpha(0.14f), catColor) } },
            }
        }, new Thickness(16, 16, 16, 8));

        var meaning = Ui.Card(new VerticalStackLayout
        {
            Spacing = 8,
            Children =
            {
                new Label { Text = "WHAT IT MEANS", FontSize = 12, FontAttributes = FontAttributes.Bold, TextColor = Ui.Muted, CharacterSpacing = 1 },
                new Label { Text = s.Description, FontSize = 15, TextColor = Color.FromArgb("#333"), LineHeight = 1.35 },
            }
        }, new Thickness(16, 0, 16, 20));

        Content = new ScrollView { Content = new VerticalStackLayout { Children = { signCard, meaning } } };
    }
}
