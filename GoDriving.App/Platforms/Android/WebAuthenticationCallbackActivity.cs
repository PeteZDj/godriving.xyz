using Android.App;
using Android.Content;
using Android.Content.PM;

namespace GoDriving.App;

// Captures the "godriving://auth" redirect from the Google sign-in browser tab.
[Activity(NoHistory = true, LaunchMode = LaunchMode.SingleTop, Exported = true)]
[IntentFilter(
    new[] { Intent.ActionView },
    Categories = new[] { Intent.CategoryDefault, Intent.CategoryBrowsable },
    DataScheme = "godriving",
    DataHost = "auth")]
public class WebAuthenticationCallbackActivity : Microsoft.Maui.Authentication.WebAuthenticatorCallbackActivity
{
}
