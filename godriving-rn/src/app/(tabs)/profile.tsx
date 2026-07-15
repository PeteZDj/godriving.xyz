import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { TopBar, XPBar } from '@/components/shared';
import { useGD } from '@/store';
import { C, font, GRAD, radius, xpIntoLevel } from '@/theme';
import { Avatar, Badge, Card, GradientButton, Row, SectionTitle, StatBlock, Txt } from '@/ui';

const GAME_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  quiz: { label: 'Highway Code Quiz', icon: 'help-circle', color: C.gold },
  match: { label: 'Sign Match', icon: 'grid', color: C.go },
  roadrun: { label: 'Road Run', icon: 'car-sport', color: C.brand },
};

const LINKS = [
  { icon: 'albums', label: 'Sign Library', sub: 'Study every road sign', route: '/game/library' },
  { icon: 'school', label: 'Driving Schools', sub: 'Find a school near you', route: '/(tabs)/schools' },
  { icon: 'business', label: 'Become a Partner', sub: 'List your driving school', route: '/partner' },
  { icon: 'download', label: 'Get the app', sub: 'Share GoDriving', route: '/downloads' },
];

export default function Profile() {
  const { user, xp, coins, level, games, signOut } = useGD();
  const gameKeys = Object.keys(games);
  const totalPlays = gameKeys.reduce((a, k) => a + (games[k]?.plays ?? 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar subtitle="Your profile" showStats={false} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Identity + level */}
        <LinearGradient colors={GRAD.deep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: 20 }}>
          <Row gap={14}>
            <Avatar name={user?.name ?? 'Guest Driver'} size={58} color={C.go} />
            <View style={{ flex: 1 }}>
              <Txt f={font.bold} size={18} color={C.white}>
                {user?.name ?? 'Guest Driver'}
              </Txt>
              <Txt f={font.body} size={12} color="#9FC7E4">
                {user?.email ?? 'Sign in to save your progress'}
              </Txt>
            </View>
            <View style={{ alignItems: 'center', backgroundColor: '#FFFFFF1E', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Txt f={font.black} size={20} color={C.go}>
                {level}
              </Txt>
              <Txt f={font.body} size={9.5} color="#9FC7E4">
                LEVEL
              </Txt>
            </View>
          </Row>

          <View style={{ marginTop: 16 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <Txt f={font.bodySemi} size={11.5} color="#9FC7E4">
                {xpIntoLevel(xp)} / 500 XP
              </Txt>
              <Txt f={font.bodySemi} size={11.5} color="#9FC7E4">
                Level {level + 1}
              </Txt>
            </Row>
            <XPBar xpInLevel={xpIntoLevel(xp)} />
          </View>

          <Row style={{ marginTop: 18, justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Row gap={5}>
                <Ionicons name="flash" size={15} color={C.go} />
                <Txt f={font.monoBold} size={17} color={C.white}>
                  {xp.toLocaleString()}
                </Txt>
              </Row>
              <Txt f={font.body} size={10.5} color="#9FC7E4">
                Total XP
              </Txt>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Row gap={5}>
                <Ionicons name="cash" size={15} color={C.gold} />
                <Txt f={font.monoBold} size={17} color={C.white}>
                  {coins.toLocaleString()}
                </Txt>
              </Row>
              <Txt f={font.body} size={10.5} color="#9FC7E4">
                Coins
              </Txt>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Row gap={5}>
                <Ionicons name="game-controller" size={15} color={C.brandLight} />
                <Txt f={font.monoBold} size={17} color={C.white}>
                  {totalPlays}
                </Txt>
              </Row>
              <Txt f={font.body} size={10.5} color="#9FC7E4">
                Games played
              </Txt>
            </View>
          </Row>
        </LinearGradient>

        {!user && (
          <GradientButton title="Sign in / Create account" icon="person" onPress={() => router.push('/login')} colors={GRAD.go} style={{ marginTop: 14 }} />
        )}

        {/* Per-game stats */}
        <View style={{ marginTop: 22 }}>
          <SectionTitle kicker="Your stats" title="Game breakdown" />
          {gameKeys.length === 0 ? (
            <Card style={{ alignItems: 'center' }} pad={24}>
              <Ionicons name="game-controller-outline" size={32} color={C.muted} />
              <Txt f={font.bold} size={14.5} color={C.ink} style={{ marginTop: 8 }}>
                No games played yet
              </Txt>
              <Txt f={font.body} size={12.5} color={C.muted} align="center" style={{ marginTop: 4 }}>
                Play a game to start earning XP and coins.
              </Txt>
              <GradientButton title="Play now" icon="play" onPress={() => router.push('/(tabs)/games')} style={{ marginTop: 16 }} />
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {gameKeys.map((k) => {
                const meta = GAME_LABELS[k] ?? { label: k, icon: 'game-controller', color: C.brand };
                const g = games[k];
                return (
                  <Card key={k} pad={14}>
                    <Row gap={12}>
                      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: meta.color + '1F', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt f={font.bold} size={14.5} color={C.ink}>
                          {meta.label}
                        </Txt>
                        <Txt f={font.body} size={11.5} color={C.muted}>
                          {g.plays} {g.plays === 1 ? 'play' : 'plays'}
                          {g.lastAccuracy != null ? ` · ${g.lastAccuracy}% last` : ''}
                        </Txt>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Txt f={font.monoBold} size={17} color={meta.color}>
                          {g.best.toLocaleString()}
                        </Txt>
                        <Txt f={font.body} size={10} color={C.muted}>
                          BEST
                        </Txt>
                      </View>
                    </Row>
                  </Card>
                );
              })}
            </View>
          )}
        </View>

        {/* Links */}
        <View style={{ marginTop: 22 }}>
          <SectionTitle kicker="Explore" title="More" />
          <Card pad={4}>
            {LINKS.map((l, i) => (
              <Pressable
                key={l.label}
                onPress={() => router.push(l.route as any)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.line2 }}>
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: C.brandMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={l.icon as any} size={18} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt f={font.bodyBold} size={14} color={C.ink}>
                    {l.label}
                  </Txt>
                  <Txt f={font.body} size={11.5} color={C.muted}>
                    {l.sub}
                  </Txt>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </Pressable>
            ))}
          </Card>
        </View>

        {user && (
          <Pressable onPress={signOut} style={{ marginTop: 18, alignItems: 'center', paddingVertical: 12 }}>
            <Row gap={6}>
              <Ionicons name="log-out-outline" size={17} color={C.red} />
              <Txt f={font.bodyBold} size={14} color={C.red}>
                Sign out
              </Txt>
            </Row>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
