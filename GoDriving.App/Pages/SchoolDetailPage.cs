using GoDriving.App.Models;

namespace GoDriving.App.Pages;

// Driving school profile with contact actions.
public class SchoolDetailPage : ContentPage
{
    public SchoolDetailPage(School s)
    {
        Title = s.Name;
        BackgroundColor = Ui.Bg;

        var logo = new Frame
        {
            WidthRequest = 72, HeightRequest = 72, CornerRadius = 16, Padding = 0, IsClippedToBounds = true, HasShadow = false,
            BackgroundColor = Colors.White, HorizontalOptions = LayoutOptions.Start,
            Content = string.IsNullOrWhiteSpace(s.Logo)
                ? new Label { Text = Ui.Initials(s.Name), FontSize = 28, FontAttributes = FontAttributes.Bold, TextColor = Colors.White, HorizontalOptions = LayoutOptions.Center, VerticalOptions = LayoutOptions.Center, BackgroundColor = Ui.Brand }
                : Ui.RemoteImage(s.Logo, 72, 72),
        };

        var badges = new HorizontalStackLayout { Spacing = 6 };
        badges.Children.Add(Ui.Pill($"\u2605 {s.RatingText}", Colors.White.WithAlpha(0.18f), Colors.White));
        if (s.Verified) badges.Children.Add(Ui.Pill("Verified", Colors.White.WithAlpha(0.18f), Colors.White));
        if (s.Featured) badges.Children.Add(Ui.Pill("Featured", Colors.White.WithAlpha(0.18f), Colors.White));

        var header = new VerticalStackLayout
        {
            BackgroundColor = Ui.Ink,
            Padding = new Thickness(22, 24, 22, 24),
            Spacing = 10,
            Children =
            {
                logo,
                new Label { Text = s.Name, FontSize = 22, FontAttributes = FontAttributes.Bold, TextColor = Colors.White },
                new Label { Text = s.LocationText, FontSize = 14, TextColor = Ui.SubInk },
                badges,
            }
        };

        var body = new VerticalStackLayout { Padding = new Thickness(16), Spacing = 14 };

        if (!string.IsNullOrWhiteSpace(s.Description))
            body.Children.Add(Ui.Card(new Label { Text = s.Description, FontSize = 14.5, TextColor = Color.FromArgb("#333"), LineHeight = 1.35 }));

        body.Children.Add(Ui.Card(new VerticalStackLayout
        {
            Spacing = 10,
            Children =
            {
                new Label { Text = "COURSE PRICING", FontSize = 12, FontAttributes = FontAttributes.Bold, TextColor = Ui.Muted, CharacterSpacing = 1 },
                new Label { Text = s.PriceText, FontSize = 18, FontAttributes = FontAttributes.Bold, TextColor = Ui.Go },
            }
        }));

        if (!string.IsNullOrWhiteSpace(s.Phone))
        {
            var call = Ui.PrimaryButton($"\U0001F4DE Call {s.Phone}");
            call.Clicked += (_, _) => { try { PhoneDialer.Default.Open(s.Phone!); } catch { } };
            body.Children.Add(call);
        }
        if (!string.IsNullOrWhiteSpace(s.Website))
        {
            var web = new Button { Text = "Visit website", BackgroundColor = Colors.White, TextColor = Ui.Brand, BorderColor = Ui.Brand, BorderWidth = 1, CornerRadius = 26, HeightRequest = 50, FontAttributes = FontAttributes.Bold };
            web.Clicked += async (_, _) => { try { await Launcher.Default.OpenAsync(new Uri(Normalize(s.Website!))); } catch { } };
            body.Children.Add(web);
        }
        if (!string.IsNullOrWhiteSpace(s.Email))
        {
            var mail = new Button { Text = $"Email {s.Email}", BackgroundColor = Colors.White, TextColor = Ui.Muted, BorderColor = Ui.Line, BorderWidth = 1, CornerRadius = 26, HeightRequest = 50 };
            mail.Clicked += (_, _) =>
            {
                try { Email.Default.ComposeAsync(new EmailMessage { Subject = "Driving lessons enquiry (via GoDriving)", To = new List<string> { s.Email! } }); } catch { }
            };
            body.Children.Add(mail);
        }

        Content = new ScrollView { Content = new VerticalStackLayout { Children = { header, body } } };
    }

    static string Normalize(string url) => url.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? url : "https://" + url;
}
