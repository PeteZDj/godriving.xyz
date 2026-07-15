import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { categoryColor, SIGNS } from '@/data/signs';
import { DetailHeader, SignSvg } from '@/components/shared';
import { C, font, radius } from '@/theme';
import { Card, GradientButton, Row, SectionTitle, Txt } from '@/ui';

export default function SignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sign = useMemo(() => SIGNS.find((s) => s.id === id), [id]);
  const related = useMemo(() => (sign ? SIGNS.filter((s) => s.category === sign.category && s.id !== sign.id).slice(0, 6) : []), [sign]);

  if (!sign) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <DetailHeader title="Sign" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Txt f={font.body} color={C.muted}>
            Sign not found.
          </Txt>
        </View>
      </View>
    );
  }

  const col = categoryColor[sign.category];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <DetailHeader title={sign.name} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Card style={{ alignItems: 'center' }} pad={24}>
          <SignSvg svg={sign.svg} size={180} />
          <View style={{ marginTop: 14, backgroundColor: col + '1A', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Txt f={font.bodyBold} size={12} color={col}>
              {sign.category}
            </Txt>
          </View>
          <Txt f={font.black} size={22} color={C.ink} align="center" style={{ marginTop: 10 }}>
            {sign.name}
          </Txt>
        </Card>

        <Card style={{ marginTop: 14 }} pad={16}>
          <Txt f={font.bodyBold} size={13} color={C.brand} style={{ letterSpacing: 0.5 }}>
            WHAT IT MEANS
          </Txt>
          <Txt f={font.body} size={14.5} color={C.subInk} style={{ marginTop: 8, lineHeight: 22 }}>
            {sign.description}
          </Txt>
        </Card>

        <GradientButton title="Test yourself in the quiz" icon="help-circle" onPress={() => router.push('/game/quiz')} colors={[C.gold, C.goldLight]} style={{ marginTop: 16 }} />

        {related.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <SectionTitle kicker={sign.category} title="Related signs" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 8 }}>
              {related.map((r) => (
                <Pressable key={r.id} onPress={() => router.push(`/sign/${r.id}` as any)}>
                  <Card style={{ width: 118, alignItems: 'center' }} pad={12}>
                    <SignSvg svg={r.svg} size={64} />
                    <Txt f={font.bodySemi} size={11.5} color={C.ink} align="center" numberOfLines={2} style={{ marginTop: 8, height: 30 }}>
                      {r.name}
                    </Txt>
                  </Card>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
