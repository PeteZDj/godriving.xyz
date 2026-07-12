namespace GoDriving.App.Models;

// GoDriving content that ships in the app: the game/lesson catalog and the full
// road-sign library (SVG mirrored from the web app's src/data/signs.ts).

public class Lesson
{
    public string Id { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Emoji { get; set; } = string.Empty;
    public string Tag { get; set; } = string.Empty;
    public string Accent { get; set; } = "#0071BC";
    public string Short { get; set; } = string.Empty;
}

public enum SignCategory { Regulatory, Warning, Mandatory, Information }

public class RoadSign
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public SignCategory Category { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Svg { get; set; } = string.Empty;
}

public static class Catalog
{
    public const string Tagline = "Learn to drive the fun way — turn the highway code into games.";

    public static string CategoryColor(SignCategory c) => c switch
    {
        SignCategory.Regulatory => "#d21e2b",
        SignCategory.Warning => "#e6a700",
        SignCategory.Mandatory => "#0d5fbe",
        SignCategory.Information => "#4caf50",
        _ => "#0071bc",
    };

    public static readonly List<Lesson> Lessons = new()
    {
        new() { Id = "drive_parking", Slug = "parking", Title = "Parking Practice", Emoji = "\U0001F17F\uFE0F", Tag = "Precision", Accent = "#f59e0b",
            Short = "Five rounds of perpendicular parking — scored on alignment, speed and clean lines." },
        new() { Id = "drive_roundabout", Slug = "roundabout", Title = "Roundabout Master", Emoji = "\U0001F504", Tag = "Navigation", Accent = "#38bdf8",
            Short = "Read the call-out, pick your lane, signal, and leave at the right exit." },
        new() { Id = "drive_lanechange", Slug = "lane-change", Title = "Lane Change Challenge", Emoji = "\u21C6", Tag = "Awareness", Accent = "#a855f7",
            Short = "Weave through highway traffic, signalling into each target lane for combo points." },
        new() { Id = "drive_emergency", Slug = "emergency", Title = "Emergency Stop", Emoji = "\U0001F6D1", Tag = "Reaction", Accent = "#ef4444",
            Short = "Build speed, then brake to a dead stop the instant a hazard appears." },
        new() { Id = "drive_night", Slug = "night", Title = "Night Drive", Emoji = "\U0001F319", Tag = "Atmospheric", Accent = "#6366f1",
            Short = "Follow glowing checkpoints through the dark with only your headlights." },
        new() { Id = "drive_reverse", Slug = "reverse", Title = "Three-Point Turn", Emoji = "\u21BA", Tag = "Technical", Accent = "#10b981",
            Short = "Turn the car around in a tight cone-marked space using forward and reverse." },
    };

    // ── SVG builders (200x200 viewBox), single-quoted attrs for C# strings ──
    static string Svg(string inner) =>
        "<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'>" + inner + "</svg>";
    static string Warn(string inner) =>
        Svg("<polygon points='100,14 190,182 10,182' fill='#ffce00' stroke='#111' stroke-width='10' stroke-linejoin='round'/>" + inner);
    static string RedCircle(string inner) =>
        Svg("<circle cx='100' cy='100' r='86' fill='#fff' stroke='#d21e2b' stroke-width='16'/>" + inner);
    static string BlueCircle(string inner) =>
        Svg("<circle cx='100' cy='100' r='92' fill='#0d5fbe'/>" + inner);
    static string BlueRect(string inner) =>
        Svg("<rect x='14' y='30' width='172' height='140' rx='10' fill='#0d5fbe' stroke='#fff' stroke-width='6'/>" + inner);

    public static readonly List<RoadSign> Signs = new()
    {
        new() { Id = "stop", Name = "Stop", Category = SignCategory.Regulatory,
            Description = "Come to a complete stop. Give way to all traffic and pedestrians before proceeding.",
            Svg = Svg("<polygon points='60,12 140,12 188,60 188,140 140,188 60,188 12,140 12,60' fill='#d21e2b' stroke='#fff' stroke-width='8'/><text x='100' y='118' font-family='Arial' font-weight='bold' font-size='52' fill='#fff' text-anchor='middle'>STOP</text>") },
        new() { Id = "yield", Name = "Give Way (Yield)", Category = SignCategory.Regulatory,
            Description = "Slow down and give way to traffic on the road you are entering.",
            Svg = Svg("<polygon points='100,186 12,26 188,26' fill='#fff' stroke='#d21e2b' stroke-width='16' stroke-linejoin='round'/><text x='100' y='90' font-family='Arial' font-weight='bold' font-size='30' fill='#111' text-anchor='middle'>GIVE</text><text x='100' y='125' font-family='Arial' font-weight='bold' font-size='30' fill='#111' text-anchor='middle'>WAY</text>") },
        new() { Id = "no-entry", Name = "No Entry", Category = SignCategory.Regulatory,
            Description = "Vehicles are prohibited from entering. Do not proceed beyond this point.",
            Svg = Svg("<circle cx='100' cy='100' r='90' fill='#d21e2b'/><rect x='42' y='86' width='116' height='28' rx='4' fill='#fff'/>") },
        new() { Id = "speed-50", Name = "Speed Limit 50", Category = SignCategory.Regulatory,
            Description = "Maximum speed of 50 km/h. Do not exceed this limit.",
            Svg = RedCircle("<text x='100' y='128' font-family='Arial' font-weight='bold' font-size='82' fill='#111' text-anchor='middle'>50</text>") },
        new() { Id = "speed-80", Name = "Speed Limit 80", Category = SignCategory.Regulatory,
            Description = "Maximum speed of 80 km/h. Common on highways and open roads.",
            Svg = RedCircle("<text x='100' y='128' font-family='Arial' font-weight='bold' font-size='82' fill='#111' text-anchor='middle'>80</text>") },
        new() { Id = "no-overtaking", Name = "No Overtaking", Category = SignCategory.Regulatory,
            Description = "Overtaking other vehicles is prohibited on this stretch of road.",
            Svg = RedCircle("<rect x='66' y='58' width='26' height='84' rx='5' fill='#111'/><rect x='108' y='58' width='26' height='84' rx='5' fill='#d21e2b'/>") },
        new() { Id = "no-parking", Name = "No Parking", Category = SignCategory.Regulatory,
            Description = "Parking is not allowed here at any time.",
            Svg = Svg("<circle cx='100' cy='100' r='86' fill='#0d5fbe' stroke='#d21e2b' stroke-width='16'/><text x='100' y='132' font-family='Arial' font-weight='bold' font-size='90' fill='#fff' text-anchor='middle'>P</text><line x1='40' y1='40' x2='160' y2='160' stroke='#d21e2b' stroke-width='16'/>") },
        new() { Id = "roundabout", Name = "Roundabout", Category = SignCategory.Regulatory,
            Description = "A roundabout ahead. Give way to traffic already on the roundabout.",
            Svg = BlueCircle("<g fill='none' stroke='#fff' stroke-width='14' stroke-linecap='round'><path d='M70 120 a34 34 0 1 1 60 -8'/></g><polygon points='132,86 150,104 118,110' fill='#fff'/>") },
        new() { Id = "children", Name = "Children Crossing", Category = SignCategory.Warning,
            Description = "Watch for children. Often near schools and playgrounds.",
            Svg = Warn("<circle cx='82' cy='86' r='12' fill='#111'/><path d='M74 104 h16 v34 h-16z' fill='#111'/><circle cx='118' cy='92' r='10' fill='#111'/><path d='M111 108 h14 v28 h-14z' fill='#111'/>") },
        new() { Id = "pedestrian", Name = "Pedestrian Crossing", Category = SignCategory.Warning,
            Description = "Pedestrian crossing ahead. Slow down and be ready to stop.",
            Svg = Warn("<circle cx='100' cy='70' r='12' fill='#111'/><path d='M92 86 h16 l10 40 h-12 l-6 -24 -6 24 h-12z' fill='#111'/>") },
        new() { Id = "sharp-bend", Name = "Sharp Bend", Category = SignCategory.Warning,
            Description = "A sharp bend or curve ahead. Reduce speed.",
            Svg = Warn("<path d='M85 150 C85 110 120 110 120 90 C120 70 95 70 95 55' fill='none' stroke='#111' stroke-width='14' stroke-linecap='round'/><polygon points='95,44 78,66 112,66' fill='#111'/>") },
        new() { Id = "slippery", Name = "Slippery Road", Category = SignCategory.Warning,
            Description = "Road may be slippery when wet. Drive with caution.",
            Svg = Warn("<rect x='86' y='70' width='28' height='46' rx='6' fill='#111'/><path d='M60 150 q20 -20 40 0 t40 0' fill='none' stroke='#111' stroke-width='10'/><path d='M70 120 l-14 22 M130 120 l14 22' stroke='#111' stroke-width='8'/>") },
        new() { Id = "roadworks", Name = "Road Works", Category = SignCategory.Warning,
            Description = "Construction or maintenance ahead. Expect workers and equipment.",
            Svg = Warn("<circle cx='100' cy='62' r='12' fill='#111'/><path d='M92 78 h16 v20 h-16z' fill='#111'/><rect x='70' y='120' width='60' height='14' fill='#111'/><path d='M118 96 l24 24' stroke='#111' stroke-width='10'/>") },
        new() { Id = "crossroads", Name = "Crossroads", Category = SignCategory.Warning,
            Description = "A crossroads junction ahead. Watch for crossing traffic.",
            Svg = Warn("<rect x='92' y='60' width='16' height='90' fill='#111'/><rect x='60' y='92' width='80' height='16' fill='#111'/>") },
        new() { Id = "traffic-signals", Name = "Traffic Signals Ahead", Category = SignCategory.Warning,
            Description = "Traffic lights ahead. Be prepared to stop.",
            Svg = Warn("<rect x='86' y='52' width='28' height='76' rx='8' fill='#111'/><circle cx='100' cy='66' r='7' fill='#d21e2b'/><circle cx='100' cy='88' r='7' fill='#ffce00'/><circle cx='100' cy='110' r='7' fill='#4caf50'/>") },
        new() { Id = "bumps", Name = "Speed Bumps", Category = SignCategory.Warning,
            Description = "Bumps or uneven road surface ahead. Slow down.",
            Svg = Warn("<path d='M50 140 q25 -46 50 0 M100 140 q25 -46 50 0' fill='none' stroke='#111' stroke-width='12'/>") },
        new() { Id = "animals", Name = "Wild Animals", Category = SignCategory.Warning,
            Description = "Wild or domestic animals may cross. Common on rural Kenyan roads.",
            Svg = Warn("<path d='M70 132 v-24 l10 -14 q4 -18 14 -10 l6 12 h18 l10 -8 v10 l-8 8 v40' fill='#111'/><path d='M112 96 l10 -18 M120 78 l6 -14' stroke='#111' stroke-width='7' fill='none'/>") },
        new() { Id = "turn-left", Name = "Turn Left Ahead", Category = SignCategory.Mandatory,
            Description = "You must turn left ahead.",
            Svg = BlueCircle("<path d='M126 118 h-38 v-30' fill='none' stroke='#fff' stroke-width='16' stroke-linecap='round' stroke-linejoin='round'/><polygon points='88,64 66,92 110,92' fill='#fff'/>") },
        new() { Id = "keep-left", Name = "Keep Left", Category = SignCategory.Mandatory,
            Description = "Pass to the left of the sign or obstruction.",
            Svg = BlueCircle("<path d='M124 60 L76 100 L124 140' fill='none' stroke='#fff' stroke-width='16' stroke-linecap='round' stroke-linejoin='round'/>") },
        new() { Id = "ahead-only", Name = "Ahead Only", Category = SignCategory.Mandatory,
            Description = "Proceed straight ahead only.",
            Svg = BlueCircle("<rect x='92' y='80' width='16' height='70' fill='#fff'/><polygon points='100,44 72,86 128,86' fill='#fff'/>") },
        new() { Id = "hospital", Name = "Hospital", Category = SignCategory.Information,
            Description = "A hospital is nearby. Drive quietly and be alert for ambulances.",
            Svg = BlueRect("<rect x='70' y='70' width='60' height='60' rx='6' fill='#fff'/><rect x='94' y='80' width='12' height='40' fill='#0d5fbe'/><rect x='80' y='94' width='40' height='12' fill='#0d5fbe'/>") },
        new() { Id = "parking", Name = "Parking", Category = SignCategory.Information,
            Description = "Designated parking area available.",
            Svg = BlueRect("<text x='100' y='140' font-family='Arial' font-weight='bold' font-size='110' fill='#fff' text-anchor='middle'>P</text>") },
        new() { Id = "fuel", Name = "Fuel Station", Category = SignCategory.Information,
            Description = "A petrol / fuel station is ahead.",
            Svg = BlueRect("<rect x='76' y='66' width='42' height='70' rx='4' fill='#fff'/><rect x='84' y='76' width='26' height='20' fill='#0d5fbe'/><path d='M118 84 h10 v40 a8 8 0 0 1 -16 0' fill='none' stroke='#fff' stroke-width='8'/>") },
        new() { Id = "bus-stop", Name = "Bus Stop", Category = SignCategory.Information,
            Description = "A designated bus stop / matatu stage.",
            Svg = BlueRect("<rect x='70' y='72' width='60' height='46' rx='6' fill='#fff'/><rect x='78' y='80' width='44' height='20' fill='#0d5fbe'/><circle cx='84' cy='122' r='8' fill='#fff'/><circle cx='116' cy='122' r='8' fill='#fff'/>") },
    };
}
