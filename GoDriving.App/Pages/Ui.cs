using Microsoft.Maui.Controls.Shapes;
using GoDriving.App.Models;

namespace GoDriving.App.Pages;

// Shared GoDriving palette + small view builders (blue brand, green "Go" accent,
// deep-navy chrome) so pages stay declarative and on-brand.
public static class Ui
{
    public static readonly Color Ink    = Color.FromArgb("#0B1B2B"); // deep navy chrome
    public static readonly Color Brand  = Color.FromArgb("#0071BC"); // GoDriving blue
    public static readonly Color BrandDk = Color.FromArgb("#005A96");
    public static readonly Color Go     = Color.FromArgb("#4CAF50"); // "Go" green
    public static readonly Color Amber  = Color.FromArgb("#F59E0B");
    public static readonly Color Muted  = Color.FromArgb("#6B7280");
    public static readonly Color Bg     = Color.FromArgb("#F4F6F9");
    public static readonly Color Line   = Color.FromArgb("#E5E7EB");
    public static readonly Color SubInk = Color.FromArgb("#B9C4D2");
    public static readonly Color InkText = Color.FromArgb("#1A1A1A");

    public static Button PrimaryButton(string text) => new()
    {
        Text = text,
        BackgroundColor = Brand,
        TextColor = Colors.White,
        FontAttributes = FontAttributes.Bold,
        CornerRadius = 26,
        HeightRequest = 52,
        FontSize = 16,
    };

    public static Frame Card(View content, Thickness? margin = null) => new()
    {
        BackgroundColor = Colors.White,
        CornerRadius = 16,
        HasShadow = true,
        BorderColor = Line,
        Padding = new Thickness(16),
        Margin = margin ?? new Thickness(0),
        Content = content,
    };

    public static View Pill(string text, Color bg, Color fg) => new Frame
    {
        BackgroundColor = bg,
        CornerRadius = 11,
        Padding = new Thickness(9, 3),
        HasShadow = false,
        HorizontalOptions = LayoutOptions.Start,
        Content = new Label { Text = text, FontSize = 11, FontAttributes = FontAttributes.Bold, TextColor = fg },
    };

    public static View StatBlock(string value, string label, Color color) => new VerticalStackLayout
    {
        Spacing = 2,
        HorizontalOptions = LayoutOptions.Center,
        Children =
        {
            new Label { Text = value, FontSize = 24, FontAttributes = FontAttributes.Bold, TextColor = color, HorizontalTextAlignment = TextAlignment.Center },
            new Label { Text = label, FontSize = 11, TextColor = Muted, HorizontalTextAlignment = TextAlignment.Center },
        }
    };

    public static Image RemoteImage(string? url, double height, double width = -1) => new()
    {
        Source = string.IsNullOrWhiteSpace(url) ? null : ImageSource.FromUri(new Uri(url)),
        Aspect = Aspect.AspectFill,
        HeightRequest = height,
        WidthRequest = width,
        BackgroundColor = Line,
    };

    // A category-coloured, sign-shaped thumbnail (fast native approximation used
    // in lists; the detail page renders the exact SVG).
    public static View SignThumb(RoadSign s, double size = 52)
    {
        var g = new Grid { WidthRequest = size, HeightRequest = size };
        switch (s.Category)
        {
            case SignCategory.Warning:
                g.Add(new Polygon
                {
                    Points = new PointCollection { new(size / 2, 3), new(size - 3, size - 5), new(3, size - 5) },
                    Fill = Color.FromArgb("#ffce00"), Stroke = Color.FromArgb("#111"), StrokeThickness = 2,
                    StrokeLineJoin = PenLineJoin.Round,
                });
                break;
            case SignCategory.Mandatory:
                g.Add(new Ellipse { Fill = Color.FromArgb("#0d5fbe"), WidthRequest = size, HeightRequest = size });
                break;
            case SignCategory.Information:
                g.Add(new Border
                {
                    Background = Color.FromArgb("#0d5fbe"), Stroke = Colors.White, StrokeThickness = 2,
                    StrokeShape = new RoundRectangle { CornerRadius = 6 },
                    WidthRequest = size, HeightRequest = size * 0.8, VerticalOptions = LayoutOptions.Center,
                });
                break;
            default: // Regulatory
                g.Add(new Ellipse { Fill = Colors.White, Stroke = Color.FromArgb("#d21e2b"), StrokeThickness = 6, WidthRequest = size, HeightRequest = size });
                break;
        }
        return g;
    }

    // Renders exact SVG markup inside a WebView for sign detail.
    public static WebView SvgView(string svg, double height = 260) => new()
    {
        HeightRequest = height,
        BackgroundColor = Colors.White,
        Source = new HtmlWebViewSource
        {
            Html = "<html><head><meta name='viewport' content='width=device-width,initial-scale=1'>" +
                   "<style>html,body{margin:0;height:100%;display:flex;align-items:center;justify-content:center;background:#fff}" +
                   "svg{width:74vw;height:74vw;max-width:260px;max-height:260px}</style></head><body>" + svg + "</body></html>"
        }
    };

    public static string Initials(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "G";
        var parts = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length == 1 ? parts[0][..1].ToUpperInvariant() : (parts[0][..1] + parts[^1][..1]).ToUpperInvariant();
    }
}
