import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { fetchLeaderboard } from '@/data/api';
import type { LeaderboardEntry } from '@/data/types';
import { TopBar } from '@/components/shared';
import { useGD } from '@/store';
import { C, font, GRAD, radius } from '@/theme';
import { Avatar, Badge, Card, Row, Txt } from '@/ui';

const TABS = [
  { id: '', label: 'Overall', game: '' },
  { id: 'quiz', label: 'Quiz', game: 'quiz' },
  { id: 'match', label: 'Match', game: 'match' },
  { id: 'roadrun', label: 'Road Run', game: 'roadrun' },
];

const MEDAL = ['#F4B400', '#B8C2CC', '#CD7F32'];

export default function Leaderboard() {
  const { xp, level, user, bestFor } = useGD();
  const [tab, setTab] = useState('');
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    setRows(null);
    fetchLeaderboard(tab || undefined).then(setRows);
  }, [tab]);

  const myScore = tab === '' ? xp : bestFor(tab);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar subtitle="Leaderboard" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Txt f={font.black} size={24} color={C.ink}>
          Leaderboard
        </Txt>
        <Txt f={font.body} size={13} color={C.textSub} style={{ marginTop: 4 }}>
          The best drivers in the country. Can you top the charts?
        </Txt>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }} contentContainerStyle={{ gap: 8 }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id)}
                style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: active ? C.brand : C.card, borderWidth: 1, borderColor: active ? C.brand : C.line }}>
                <Txt f={font.bodySemi} size={13} color={active ? C.white : C.textSub}>
                  {t.label}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Your rank card */}
        <LinearGradient colors={GRAD.deep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.lg, padding: 16, marginTop: 16 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={12}>
              <Avatar name={user?.name ?? 'You'} size={44} color={C.go} />
              <View>
                <Txt f={font.bold} size={15} color={C.white}>
                  {user?.name ?? 'You (guest)'}
                </Txt>
                <Txt f={font.body} size={11.5} color="#9FC7E4">
                  {tab === '' ? `Level ${level}` : `${TABS.find((t) => t.id === tab)?.label} best`}
                </Txt>
              </View>
            </Row>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt f={font.black} size={22} color={C.go}>
                {myScore.toLocaleString()}
              </Txt>
              <Txt f={font.body} size={10.5} color="#9FC7E4">
                {tab === '' ? 'XP' : 'points'}
              </Txt>
            </View>
          </Row>
        </LinearGradient>

        {/* List */}
        {rows === null ? (
          <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} />
        ) : rows.length === 0 ? (
          <Card style={{ marginTop: 20, alignItems: 'center' }} pad={24}>
            <Ionicons name="podium-outline" size={32} color={C.muted} />
            <Txt f={font.bold} size={15} color={C.ink} style={{ marginTop: 8 }}>
              No scores yet
            </Txt>
            <Txt f={font.body} size={12.5} color={C.muted} align="center" style={{ marginTop: 4 }}>
              Be the first to set a score in this game!
            </Txt>
          </Card>
        ) : (
          <View style={{ marginTop: 16, gap: 8 }}>
            {rows.map((r, i) => (
              <Card key={`${r.name}-${i}`} pad={12} style={i < 3 ? { borderColor: MEDAL[i] + '77', borderWidth: 1.5 } : undefined}>
                <Row gap={12}>
                  <View style={{ width: 30, alignItems: 'center' }}>
                    {i < 3 ? (
                      <Ionicons name="medal" size={22} color={MEDAL[i]} />
                    ) : (
                      <Txt f={font.bold} size={15} color={C.muted}>
                        {i + 1}
                      </Txt>
                    )}
                  </View>
                  <Avatar name={r.name} size={38} />
                  <View style={{ flex: 1 }}>
                    <Txt f={font.bodyBold} size={14} color={C.ink} numberOfLines={1}>
                      {r.name}
                    </Txt>
                    {(r.city || r.country) && (
                      <Txt f={font.body} size={11.5} color={C.muted}>
                        {[r.city, r.country].filter(Boolean).join(', ')}
                      </Txt>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Txt f={font.monoBold} size={15} color={C.brand}>
                      {r.score.toLocaleString()}
                    </Txt>
                    {tab === '' && r.level != null && (
                      <Badge label={`Lv ${r.level}`} bg={C.go + '1A'} color={C.goDark} />
                    )}
                  </View>
                </Row>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
