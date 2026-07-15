import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';
import { fetchStats } from '@/data/api';
import { CATEGORIES, categoryColor, SIGNS } from '@/data/signs';
import type { PublicStats } from '@/data/types';
import { SignSvg, TopBar } from '@/components/shared';
import { useGD } from '@/store';
import { C, font, GRAD, radius, shadow, xpIntoLevel } from '@/theme';
import { Badge, Card, GradientButton, Row, SectionTitle, StatBlock, Txt } from '@/ui';

const { width } = Dimensions.get('window');

const GAMES = [
  { id: 'library', title: 'Sign Library', desc: 'Study every road sign', icon: 'albums', route: '/game/library', colors: GRAD.brand, tag: 'No login' },
  { id: 'quiz', title: 'Highway Code Quiz', desc: 'Beat the clock, build streaks', icon: 'help-circle', route: '/game/quiz', colors: GRAD.gold, tag: 'Timed' },
  { id: 'match', title: 'Sign Match', desc: 'Memory pairs challenge', icon: 'grid', route: '/game/match', colors: GRAD.go, tag: 'Memory' },
  { id: 'roadrun', title: 'Road Run', desc: 'Dodge traffic, collect coins', icon: 'car-sport', route: '/game/roadrun', colors: GRAD.brandGlow, tag: 'Arcade' },
] as const;

const HOW = [
  { icon: 'game-controller', title: 'Play & learn', text: 'Master signs and the highway code through quick, addictive games.' },
  { icon: 'trophy', title: 'Earn XP & rank', text: 'Every game awards XP and coins. Climb the national leaderboard.' },
  { icon: 'school', title: 'Find a school', text: 'When you\u2019re ready, connect with a trusted local driving school.' },
];

export default function Home() {
  const { xp, level, coins, user } = useGD();
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetchStats().then(setStats);
  }, []);

  const featured = useMemo(() => SIGNS.slice(0, 8), []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar subtitle="Learn to drive by playing" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <LinearGradient colors={GRAD.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 20, paddingTop: 26, paddingBottom: 30 }}>
          <Badge label="🇰🇪 Built for Africa" bg="#FFFFFF22" color={C.white} />
          <Txt f={font.black} size={32} color={C.white} style={{ marginTop: 14, lineHeight: 38 }}>
            Learn to drive{'\n'}by playing.
          </Txt>
          <Txt f={font.body} size={14.5} color="#DCEEFB" style={{ marginTop: 10, lineHeight: 21 }}>
            Master road signs and the highway code through games and puzzles — then connect with trusted local driving schools.
          </Txt>
          <Row gap={10} style={{ marginTop: 20 }}>
            <GradientButton title="Start playing" icon="play" colors={GRAD.go} onPress={() => router.push('/game/quiz')} style={{ flex: 1 }} />
            <Pressable
              onPress={() => router.push('/(tabs)/schools')}
              style={{ height: 50, paddingHorizontal: 18, borderRadius: radius.pill, borderWidth: 1.5, borderColor: '#FFFFFF55', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }}>
              <Ionicons name="school" size={17} color={C.white} />
              <Txt f={font.bodyBold} size={14} color={C.white}>
                Schools
              </Txt>
            </Pressable>
          </Row>
        </LinearGradient>

        {/* Stats bar */}
        <View style={{ paddingHorizontal: 16, marginTop: -18 }}>
          <Card style={{ ...shadow.soft }} pad={16}>
            <Row>
              <StatBlock value={stats ? stats.learners.toLocaleString() : '—'} label="Learners" color={C.brand} />
              <View style={{ width: 1, backgroundColor: C.line, alignSelf: 'stretch' }} />
              <StatBlock value={stats ? String(stats.schools) : '—'} label="Schools" color={C.go} />
              <View style={{ width: 1, backgroundColor: C.line, alignSelf: 'stretch' }} />
              <StatBlock value={stats ? stats.gamesPlayed.toLocaleString() : '—'} label="Games played" color={C.gold} />
            </Row>
          </Card>
        </View>

        {/* Your progress */}
        <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <Pressable onPress={() => router.push('/(tabs)/profile')}>
            <LinearGradient colors={GRAD.deep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.lg, padding: 16 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View>
                  <Txt f={font.bodyBold} size={12} color="#9FC7E4">
                    {user ? `Welcome back, ${user.name.split(' ')[0]}` : 'Your progress'}
                  </Txt>
                  <Row gap={8} style={{ marginTop: 4 }}>
                    <Txt f={font.black} size={24} color={C.white}>
                      Level {level}
                    </Txt>
                    <Badge label={`${xp.toLocaleString()} XP`} bg="#FFFFFF1E" color={C.go} />
                  </Row>
                </View>
                <Row gap={5}>
                  <Ionicons name="cash" size={18} color={C.gold} />
                  <Txt f={font.bold} size={18} color={C.white}>
                    {coins}
                  </Txt>
                </Row>
              </Row>
              <View style={{ marginTop: 12, height: 8, backgroundColor: '#FFFFFF22', borderRadius: 8, overflow: 'hidden' }}>
                <LinearGradient colors={GRAD.go} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.max(3, (xpIntoLevel(xp) / 500) * 100)}%`, height: 8 }} />
              </View>
              <Txt f={font.body} size={10.5} color="#9FC7E4" style={{ marginTop: 6 }}>
                {500 - xpIntoLevel(xp)} XP to level {level + 1}
              </Txt>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Games */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <SectionTitle kicker="Signs & Theory" title="Play a game" action="All games" onAction={() => router.push('/(tabs)/games')} />
          <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {GAMES.map((g) => (
              <Pressable key={g.id} onPress={() => router.push(g.route as any)} style={{ width: (width - 32 - 12) / 2, marginBottom: 12 }}>
                <Card pad={0} style={{ overflow: 'hidden' }}>
                  <LinearGradient colors={g.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 14, height: 96, justifyContent: 'space-between' }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Ionicons name={g.icon as any} size={26} color={C.white} />
                      <Badge label={g.tag} bg="#FFFFFF2E" color={C.white} />
                    </Row>
                    <Txt f={font.bold} size={15} color={C.white}>
                      {g.title}
                    </Txt>
                  </LinearGradient>
                  <View style={{ padding: 12 }}>
                    <Txt f={font.body} size={12} color={C.textSub}>
                      {g.desc}
                    </Txt>
                  </View>
                </Card>
              </Pressable>
            ))}
          </Row>
        </View>

        {/* Featured signs */}
        <View style={{ marginTop: 12 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle kicker="Road signs" title="Know your signs" action="Library" onAction={() => router.push('/game/library')} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {featured.map((s) => (
              <Pressable key={s.id} onPress={() => router.push(`/sign/${s.id}` as any)}>
                <Card style={{ width: 128, alignItems: 'center' }} pad={12}>
                  <SignSvg svg={s.svg} size={72} />
                  <Txt f={font.bodySemi} size={12} color={C.ink} align="center" numberOfLines={2} style={{ marginTop: 8, height: 32 }}>
                    {s.name}
                  </Txt>
                  <View style={{ marginTop: 4, backgroundColor: categoryColor[s.category] + '1A', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Txt f={font.bodyBold} size={9.5} color={categoryColor[s.category]}>
                      {s.category}
                    </Txt>
                  </View>
                </Card>
              </Pressable>
            ))}
          </ScrollView>
          <Row gap={8} style={{ paddingHorizontal: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => (
              <Row key={cat} gap={5}>
                <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: categoryColor[cat] }} />
                <Txt f={font.body} size={11} color={C.muted}>
                  {cat}
                </Txt>
              </Row>
            ))}
          </Row>
        </View>

        {/* How it works */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <SectionTitle kicker="How it works" title="Three steps to the road" />
          {HOW.map((h, i) => (
            <Card key={h.title} style={{ marginBottom: 10 }} pad={16}>
              <Row gap={14}>
                <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.brandMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={h.icon as any} size={22} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt f={font.bold} size={15} color={C.ink}>
                    {i + 1}. {h.title}
                  </Txt>
                  <Txt f={font.body} size={12.5} color={C.textSub} style={{ marginTop: 2, lineHeight: 18 }}>
                    {h.text}
                  </Txt>
                </View>
              </Row>
            </Card>
          ))}
        </View>

        {/* Partner CTA */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <LinearGradient colors={GRAD.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: 22 }}>
            <Txt f={font.bold} size={19} color={C.white}>
              Run a driving school?
            </Txt>
            <Txt f={font.body} size={13} color="#DCEEFB" style={{ marginTop: 6, lineHeight: 19 }}>
              Join GoDriving and get matched with motivated learners in your city.
            </Txt>
            <GradientButton title="Become a partner" icon="business" colors={GRAD.gold} onPress={() => router.push('/partner')} style={{ alignSelf: 'flex-start', marginTop: 16 }} />
          </LinearGradient>
        </View>

        <Pressable onPress={() => router.push('/downloads')} style={{ alignItems: 'center', marginTop: 24 }}>
          <Txt f={font.body} size={12} color={C.muted}>
            GoDriving.xyz — Drive smart, drive safe 🌍
          </Txt>
        </Pressable>
      </ScrollView>
    </View>
  );
}
