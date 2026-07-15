import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { TopBar } from '@/components/shared';
import { useGD } from '@/store';
import { C, font, GRAD, radius } from '@/theme';
import { Badge, Card, Row, SectionTitle, Txt } from '@/ui';

const THEORY = [
  { id: 'library', game: '', title: 'Sign Library', desc: 'Flip through every road sign and learn what each one means.', icon: 'albums', route: '/game/library', colors: GRAD.brand, tag: 'No login' },
  { id: 'quiz', game: 'quiz', title: 'Highway Code Quiz', desc: '10 timed questions. Build streaks for bonus points.', icon: 'help-circle', route: '/game/quiz', colors: GRAD.gold, tag: 'Timed' },
  { id: 'match', game: 'match', title: 'Sign Match', desc: 'Match six signs with their names against the clock.', icon: 'grid', route: '/game/match', colors: GRAD.go, tag: 'Memory' },
  { id: 'roadrun', game: 'roadrun', title: 'Road Run', desc: 'Weave through 3 lanes of traffic and grab coins.', icon: 'car-sport', route: '/game/roadrun', colors: GRAD.brandGlow, tag: 'Arcade' },
] as const;

const DRIVE = [
  { slug: 'parking', title: 'Parking Practice', tag: 'Precision', accent: '#F59E0B', icon: 'car' },
  { slug: 'roundabout', title: 'Roundabout Master', tag: 'Junctions', accent: '#38BDF8', icon: 'sync' },
  { slug: 'lane-change', title: 'Lane Change Challenge', tag: 'Awareness', accent: '#A855F7', icon: 'swap-horizontal' },
  { slug: 'emergency', title: 'Emergency Stop', tag: 'Reaction', accent: '#EF4444', icon: 'warning' },
  { slug: 'night', title: 'Night Drive', tag: 'Visibility', accent: '#6366F1', icon: 'moon' },
  { slug: 'reverse', title: 'Three-Point Turn', tag: 'Control', accent: '#10B981', icon: 'return-down-back' },
] as const;

export default function Games() {
  const { bestFor } = useGD();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar subtitle="Games & puzzles" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <SectionTitle kicker="Signs & Theory" title="Playable now" />
        {THEORY.map((g) => {
          const best = g.game ? bestFor(g.game) : 0;
          return (
            <Pressable key={g.id} onPress={() => router.push(g.route as any)} style={{ marginBottom: 12 }}>
              <Card pad={0} style={{ overflow: 'hidden' }}>
                <Row style={{ alignItems: 'stretch' }}>
                  <LinearGradient colors={g.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 88, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={g.icon as any} size={34} color={C.white} />
                  </LinearGradient>
                  <View style={{ flex: 1, padding: 14 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Txt f={font.bold} size={16} color={C.ink}>
                        {g.title}
                      </Txt>
                      <Badge label={g.tag} />
                    </Row>
                    <Txt f={font.body} size={12.5} color={C.textSub} style={{ marginTop: 4, lineHeight: 18 }}>
                      {g.desc}
                    </Txt>
                    {g.game ? (
                      <Row gap={5} style={{ marginTop: 8 }}>
                        <Ionicons name="trophy" size={13} color={C.gold} />
                        <Txt f={font.bodyBold} size={12} color={C.muted}>
                          Best: {best.toLocaleString()}
                        </Txt>
                      </Row>
                    ) : null}
                  </View>
                </Row>
              </Card>
            </Pressable>
          );
        })}

        <View style={{ marginTop: 14 }}>
          <SectionTitle kicker="Behind the Wheel" title="Driving simulator" />
          <Card style={{ marginBottom: 12, backgroundColor: C.brandMuted, borderColor: C.brand + '33' }} pad={14}>
            <Row gap={10}>
              <Ionicons name="desktop-outline" size={20} color={C.brand} />
              <Txt f={font.body} size={12.5} color={C.subInk} style={{ flex: 1, lineHeight: 18 }}>
                The full 3D-style driving lessons run best on a keyboard. Tap a lesson to open it on godriving.xyz.
              </Txt>
            </Row>
          </Card>
          <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {DRIVE.map((d) => (
              <Pressable
                key={d.slug}
                onPress={() => Linking.openURL(`https://godriving.xyz/games/drive/${d.slug}`)}
                style={{ width: '48.5%', marginBottom: 12 }}>
                <Card pad={14} style={{ borderColor: d.accent + '44' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: d.accent + '1F', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={d.icon as any} size={22} color={d.accent} />
                  </View>
                  <Txt f={font.bold} size={14} color={C.ink} style={{ marginTop: 10 }}>
                    {d.title}
                  </Txt>
                  <Row gap={4} style={{ marginTop: 6 }}>
                    <Txt f={font.bodyBold} size={10.5} color={d.accent}>
                      {d.tag}
                    </Txt>
                    <Ionicons name="open-outline" size={11} color={C.muted} />
                  </Row>
                </Card>
              </Pressable>
            ))}
          </Row>
        </View>
      </ScrollView>
    </View>
  );
}
