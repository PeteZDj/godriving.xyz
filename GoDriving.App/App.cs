using GoDriving.App.Services;

namespace GoDriving.App;

public class App : Application
{
    public App(ApiClient api, AppState appState)
    {
        MainPage = new AppShell(api, appState);
    }
}
