import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking, ScrollView, View } from 'react-native';
import { DetailHeader } from '@/components/shared';
import { C, font, GRAD, radius } from '@/theme';
import { Card, GradientButton, Row, Txt } from '@/ui';

const FEATURES = [
  { icon: 'albums', title: 'Sign Library', text: 'Every road sign with clear meanings.' },
  { icon: 'help-circle', title: 'Timed Quizzes', text: 'Test your highway-code knowledge.' },
  { icon: 'car-sport', title: 'Arcade Games', text: 'Road Run and Sign Match for fun practice.' },
  { icon: 'school', title: 'Find Schools', text: 'Connect with trusted local instructors.' },
];

export default function Downloads() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <DetailHeader title="Get the app" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <LinearGradient colors={GRAD.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: 24, alignItems: 'center' }}>
          <View style={{ width: 76, height: 76, borderRadius: 20, backgroundColor: '#FFFFFF22', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="car-sport" size={40} color={C.white} />
          </View>
          <Txt f={font.black} size={24} color={C.white} align="center" style={{ marginTop: 14 }}>
            GoDriving on Android
          </Txt>
          <Txt f={font.body} size={13.5} color="#DCEEFB" align="center" style={{ marginTop: 8, lineHeight: 20 }}>
            Learn to drive by playing — anywhere, anytime. Download the app and start earning XP today.
          </Txt>
          <GradientButton
            title="Download APK"
            icon="download"
            colors={GRAD.go}
            onPress={() => Linking.openURL('https://godriving.xyz/downloads/godriving-app.apk')}
            style={{ marginTop: 20, alignSelf: 'stretch' }}
          />
        </LinearGradient>

        <View style={{ marginTop: 18, gap: 10 }}>
          {FEATURES.map((f) => (
            <Card key={f.title} pad={14}>
              <Row gap={12}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.brandMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={f.icon as any} size={22} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt f={font.bold} size={14.5} color={C.ink}>
                    {f.title}
                  </Txt>
                  <Txt f={font.body} size={12.5} color={C.textSub} style={{ marginTop: 2 }}>
                    {f.text}
                  </Txt>
                </View>
              </Row>
            </Card>
          ))}
        </View>

        <Card style={{ marginTop: 16, alignItems: 'center' }} pad={16}>
          <Txt f={font.body} size={12.5} color={C.muted} align="center">
            Prefer the web version? Play instantly at
          </Txt>
          <Txt f={font.bodyBold} size={14} color={C.brand} style={{ marginTop: 2 }} onPress={() => Linking.openURL('https://godriving.xyz')}>
            godriving.xyz
          </Txt>
        </Card>
      </ScrollView>
    </View>
  );
}
