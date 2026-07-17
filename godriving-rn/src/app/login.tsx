import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { googleBridgeSignIn } from '@/lib/googleBridge';
import { useGD } from '@/store';
import { C, font, GRAD, radius } from '@/theme';
import { GradientButton, Row, Txt } from '@/ui';

const DEMO = [
  { name: 'Pete Njagi', email: 'pete@godriving.xyz', city: 'Nairobi', country: 'Kenya' },
  { name: 'Amina Yusuf', email: 'amina@godriving.xyz', city: 'Mombasa', country: 'Kenya' },
];

export default function Login() {
  const insets = useSafeAreaInsets();
  const { signIn } = useGD();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'google' | null>(null);
  const [error, setError] = useState('');

  const submit = () => {
    if (!email) return;
    const finalName = mode === 'signup' ? name || email.split('@')[0] : email.split('@')[0];
    signIn(finalName, email, { provider: 'email' });
    router.back();
  };

  const handleGoogle = async () => {
    setError('');
    setBusy('google');
    try {
      const r = await googleBridgeSignIn();
      if (r && r.email) {
        signIn(r.name, r.email, { city: r.city, country: r.country, provider: 'google' });
        router.back();
      }
    } catch (e: any) {
      setError(e?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const demo = (d: (typeof DEMO)[number]) => {
    signIn(d.name, d.email, { city: d.city, country: d.country, provider: 'demo' });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <LinearGradient colors={GRAD.deep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + 14, paddingBottom: 32, paddingHorizontal: 20 }}>
          <Row style={{ justifyContent: 'flex-end' }}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="close" size={26} color={C.white} />
            </Pressable>
          </Row>
          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="car-sport" size={32} color={C.white} />
            </View>
            <Row gap={0} style={{ marginTop: 12 }}>
              <Txt f={font.black} size={24} color={C.white}>
                Go
              </Txt>
              <Txt f={font.black} size={24} color={C.go}>
                Driving
              </Txt>
            </Row>
            <Txt f={font.body} size={13} color="#9FC7E4" style={{ marginTop: 4 }}>
              {mode === 'signup' ? 'Create your free account' : 'Welcome back, driver'}
            </Txt>
          </View>
        </LinearGradient>

        <View style={{ padding: 20, marginTop: -16 }}>
          {/* Mode toggle */}
          <Row style={{ backgroundColor: C.card, borderRadius: radius.pill, borderWidth: 1, borderColor: C.line, padding: 4, marginBottom: 18 }}>
            {(['signup', 'login'] as const).map((m) => {
              const active = mode === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: active ? C.brand : 'transparent', alignItems: 'center' }}>
                  <Txt f={font.bodyBold} size={13.5} color={active ? C.white : C.textSub}>
                    {m === 'signup' ? 'Sign up' : 'Log in'}
                  </Txt>
                </Pressable>
              );
            })}
          </Row>

          <Pressable
            onPress={handleGoogle}
            disabled={busy === 'google'}
            style={{ height: 50, borderRadius: radius.pill, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16, opacity: busy === 'google' ? 0.6 : 1 }}>
            {busy === 'google' ? (
              <ActivityIndicator color={C.brand} />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color="#DB4437" />
                <Txt f={font.bodyBold} size={14} color={C.ink}>
                  Continue with Google
                </Txt>
              </>
            )}
          </Pressable>

          {!!error && (
            <Txt f={font.body} size={12} color="#DB4437" align="center" style={{ marginBottom: 12 }}>
              {error}
            </Txt>
          )}

          <Row gap={10} style={{ marginBottom: 16 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
            <Txt f={font.body} size={11.5} color={C.muted}>
              or
            </Txt>
            <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
          </Row>

          {mode === 'signup' && <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" />}
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

          <GradientButton title={mode === 'signup' ? 'Create account' : 'Log in'} icon="arrow-forward" onPress={submit} style={{ marginTop: 6 }} />

          {/* Demo accounts */}
          <View style={{ marginTop: 24 }}>
            <Txt f={font.bodySemi} size={12} color={C.muted} align="center" style={{ marginBottom: 10 }}>
              Or try a demo account
            </Txt>
            <Row gap={10}>
              {DEMO.map((d) => (
                <Pressable
                  key={d.email}
                  onPress={() => demo(d)}
                  style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: radius.md, padding: 12, alignItems: 'center' }}>
                  <Ionicons name="person-circle" size={26} color={C.brand} />
                  <Txt f={font.bodyBold} size={12.5} color={C.ink} style={{ marginTop: 4 }}>
                    {d.name.split(' ')[0]}
                  </Txt>
                  <Txt f={font.body} size={10.5} color={C.muted}>
                    {d.city}
                  </Txt>
                </Pressable>
              ))}
            </Row>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({ label, ...rest }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Txt f={font.bodySemi} size={12} color={C.subInk} style={{ marginBottom: 6 }}>
        {label}
      </Txt>
      <TextInput
        {...rest}
        placeholderTextColor={C.muted}
        style={{
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 13,
          fontFamily: font.body,
          fontSize: 14,
          color: C.ink,
        }}
      />
    </View>
  );
}
