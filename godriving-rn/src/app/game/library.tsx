import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';
import { CATEGORIES, categoryColor, SIGNS, type SignCategory } from '@/data/signs';
import { DetailHeader, SignSvg } from '@/components/shared';
import { C, font, radius } from '@/theme';
import { Card, GradientButton, Row, Txt } from '@/ui';

const { width } = Dimensions.get('window');
const COL = 2;
const CARD_W = (width - 16 * 2 - 12) / COL;

type Filter = 'All' | SignCategory;

export default function SignLibrary() {
  const [filter, setFilter] = useState<Filter>('All');
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const signs = useMemo(() => (filter === 'All' ? SIGNS : SIGNS.filter((s) => s.category === filter)), [filter]);
  const filters: Filter[] = ['All', ...CATEGORIES];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <DetailHeader title="Sign Library" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Txt f={font.body} size={13} color={C.textSub} style={{ lineHeight: 19 }}>
          Study every road sign. Tap a card to reveal what it means. No login required.
        </Txt>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }} contentContainerStyle={{ gap: 8 }}>
          {filters.map((f) => {
            const active = filter === f;
            const col = f === 'All' ? C.brand : categoryColor[f as SignCategory];
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: active ? col : C.card, borderWidth: 1, borderColor: active ? col : C.line }}>
                <Txt f={font.bodySemi} size={13} color={active ? C.white : C.textSub}>
                  {f}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Grid */}
        <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16 }}>
          {signs.map((s) => {
            const isFlipped = flipped[s.id];
            const col = categoryColor[s.category];
            return (
              <Pressable
                key={s.id}
                onPress={() => setFlipped((p) => ({ ...p, [s.id]: !p[s.id] }))}
                style={{ width: CARD_W, marginBottom: 12 }}>
                <Card pad={12} style={{ minHeight: 176, alignItems: 'center', justifyContent: 'flex-start' }}>
                  <SignSvg svg={s.svg} size={96} />
                  <View style={{ marginTop: 8, backgroundColor: col + '1A', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Txt f={font.bodyBold} size={9.5} color={col}>
                      {s.category}
                    </Txt>
                  </View>
                  <Txt f={font.bodyBold} size={12.5} color={C.ink} align="center" style={{ marginTop: 6 }}>
                    {s.name}
                  </Txt>
                  {isFlipped ? (
                    <Txt f={font.body} size={11} color={C.textSub} align="center" style={{ marginTop: 4, lineHeight: 15 }}>
                      {s.description}
                    </Txt>
                  ) : (
                    <Txt f={font.body} size={10.5} color={C.muted} align="center" style={{ marginTop: 4 }}>
                      Tap to reveal meaning
                    </Txt>
                  )}
                </Card>
              </Pressable>
            );
          })}
        </Row>

        <GradientButton title="Take the quiz" icon="help-circle" onPress={() => router.replace('/game/quiz')} colors={[C.gold, C.goldLight]} style={{ marginTop: 8 }} />
      </ScrollView>
    </View>
  );
}
