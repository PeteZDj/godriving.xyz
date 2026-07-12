using GoDriving.App.Pages;
using GoDriving.App.Services;

namespace GoDriving.App;

public class AppShell : Shell
{
    static readonly Color Ink   = Color.FromArgb("#0B1B2B"); // deep navy chrome
    static readonly Color Brand = Color.FromArgb("#0071BC"); // GoDriving blue
    static readonly Color Muted = Color.FromArgb("#8A93A6");

    public AppShell(ApiClient api, AppState appState)
    {
        FlyoutBehavior = FlyoutBehavior.Disabled;
        Title = "GoDriving";

        Shell.SetBackgroundColor(this, Ink);
        Shell.SetForegroundColor(this, Colors.White);
        Shell.SetTitleColor(this, Colors.White);
        SetValue(Shell.TabBarBackgroundColorProperty, Ink);
        SetValue(Shell.TabBarForegroundColorProperty, Brand);
        SetValue(Shell.TabBarTitleColorProperty, Brand);
        SetValue(Shell.TabBarUnselectedColorProperty, Muted);

        var tabBar = new TabBar();

        tabBar.Items.Add(new Tab
        {
            Title = "Play",
            Items = { new ShellContent { Title = "Play", Content = new HomePage(api, appState) } }
        });

        tabBar.Items.Add(new Tab
        {
            Title = "Signs",
            Items = { new ShellContent { Title = "Signs", Content = new SignsPage(api, appState) } }
        });

        tabBar.Items.Add(new Tab
        {
            Title = "Schools",
            Items = { new ShellContent { Title = "Schools", Content = new SchoolsPage(api, appState) } }
        });

        tabBar.Items.Add(new Tab
        {
            Title = "Account",
            Items = { new ShellContent { Title = "Account", Content = new AccountPage(api, appState) } }
        });

        Items.Add(tabBar);
    }
}
