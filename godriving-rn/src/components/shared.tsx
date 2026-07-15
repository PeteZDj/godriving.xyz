import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoryColor, type RoadSign, type SignCategory } from '@/data/signs';
import { C, GRAD, font, radius, shadow } from '@/theme';
import { Card, GradientButton, OutlineButton, Row, Txt } from '@/ui';
import { useGD } from '@/store';

/* ── Sign SVG renderer ────────────────────────────────────────────────── */
export function SignSvg({ svg, size = 96 }: { svg: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <SvgXml xml={svg} width={size} height={size} />
    </View>
  );
}

/* ── Category pill ────────────────────────────────────────────────────── */
export function CategoryPill({ category }: { category: SignCategory }) {
  const col = categoryColor[category];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: col + '1A', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Txt f={font.bodyBold} size={10.5} color={col} style={{ letterSpacing: 0.3 }}>
        {category}
      </Txt>
    </View>
  );
}

/* ── Top bar (blue header + XP/coins) ─────────────────────────────────── */
export function TopBar({ title, subtitle, showStats = true }: { title?: string; subtitle?: string; showStats?: boolean }) {
  const insets = useSafeAreaInsets();
  const { coins, level, user } = useGD();
  return (
    <LinearGradient colors={GRAD.deep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 18 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.push('/(tabs)')}>
          <Row gap={9}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="car-sport" size={20} color={C.white} />
            </View>
            <View>
              <Row gap={0}>
                <Txt f={font.extra} size={18} color={C.white}>
                  Go
                </Txt>
                <Txt f={font.extra} size={18} color={C.go}>
                  Driving
                </Txt>
              </Row>
              {subtitle && (
                <Txt f={font.body} size={10.5} color="#9FC7E4">
                  {subtitle}
                </Txt>
              )}
            </View>
          </Row>
        </Pressable>
        {showStats && (
          <Row gap={8}>
            <StatPill icon="cash" value={coins} color={C.gold} />
            <StatPill icon="ribbon" value={`Lv ${level}`} color={C.go} />
          </Row>
        )}
      </Row>
    </LinearGradient>
  );
}

export function StatPill({ icon, value, color }: { icon: any; value: string | number; color: string }) {
  return (
    <Row gap={5} style={{ backgroundColor: '#FFFFFF1E', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#FFFFFF33' }}>
      <Ionicons name={icon} size={13} color={color} />
      <Txt f={font.bodyBold} size={12} color={C.white}>
        {value}
      </Txt>
    </Row>
  );
}

/* ── Detail header ────────────────────────────────────────────────────── */
export function DetailHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={GRAD.deep} style={{ paddingTop: insets.top + 6, paddingBottom: 12, paddingHorizontal: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.push('/(tabs)'))} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
          <Ionicons name="chevron-back" size={24} color={C.white} />
          <Txt f={font.bold} size={17} color={C.white} numberOfLines={1} style={{ flex: 1 }}>
            {title}
          </Txt>
        </Pressable>
        {right}
      </Row>
    </LinearGradient>
  );
}

/* ── XP progress bar ──────────────────────────────────────────────────── */
export function XPBar({ xpInLevel, height = 10 }: { xpInLevel: number; height?: number }) {
  const pct = Math.max(3, Math.min(100, (xpInLevel / 500) * 100));
  return (
    <View style={{ height, backgroundColor: C.line, borderRadius: height, overflow: 'hidden' }}>
      <LinearGradient colors={GRAD.go} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${pct}%`, height, borderRadius: height }} />
    </View>
  );
}

/* ── Game over modal ──────────────────────────────────────────────────── */
export function GameOverModal({
  open,
  title = 'Round complete!',
  score,
  accuracy,
  xpGain,
  coinGain,
  onReplay,
  onClose,
}: {
  open: boolean;
  title?: string;
  score: number;
  accuracy?: number | null;
  xpGain?: number;
  coinGain?: number;
  onReplay: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <Card style={{ width: '100%', alignItems: 'center', borderRadius: radius.xxl, ...shadow.soft }} pad={26}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: C.go + '1F', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Ionicons name="trophy" size={34} color={C.go} />
          </View>
          <Txt f={font.bold} size={18} color={C.ink} align="center">
            {title}
          </Txt>
          <Txt f={font.black} size={44} color={C.brand} style={{ marginTop: 6 }}>
            {score.toLocaleString()}
          </Txt>
          {accuracy != null && (
            <Txt f={font.body} size={13} color={C.muted}>
              {accuracy}% accuracy
            </Txt>
          )}
          {(xpGain != null || coinGain != null) && (
            <Row gap={14} style={{ marginTop: 12 }}>
              {xpGain != null && (
                <Row gap={5}>
                  <Ionicons name="flash" size={16} color={C.brand} />
                  <Txt f={font.bodyBold} size={14} color={C.brand}>
                    +{xpGain} XP
                  </Txt>
                </Row>
              )}
              {coinGain != null && (
                <Row gap={5}>
                  <Ionicons name="cash" size={16} color={C.gold} />
                  <Txt f={font.bodyBold} size={14} color={C.gold}>
                    +{coinGain}
                  </Txt>
                </Row>
              )}
            </Row>
          )}
          <GradientButton title="Play again" icon="refresh" onPress={onReplay} style={{ alignSelf: 'stretch', marginTop: 22 }} />
          <Row gap={10} style={{ marginTop: 10, alignSelf: 'stretch' }}>
            <OutlineButton title="Games" onPress={() => { onClose(); router.push('/(tabs)/games'); }} style={{ flex: 1, height: 46 }} />
            <OutlineButton title="Ranks" onPress={() => { onClose(); router.push('/(tabs)/leaderboard'); }} style={{ flex: 1, height: 46 }} />
          </Row>
        </Card>
      </View>
    </Modal>
  );
}

export type { RoadSign };
