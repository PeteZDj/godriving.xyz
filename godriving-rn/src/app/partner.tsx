import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { submitPartner } from '@/data/api';
import { DetailHeader } from '@/components/shared';
import { C, font, radius } from '@/theme';
import { Card, GradientButton, Row, Txt } from '@/ui';

const COUNTRIES = ['Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Nigeria', 'Ghana', 'Other'];

const PERKS = [
  { icon: 'people', title: 'Motivated learners', text: 'Reach students already studying the highway code in-app.' },
  { icon: 'trending-up', title: 'Grow enrollment', text: 'Receive qualified leads from your city, ready to book.' },
  { icon: 'shield-checkmark', title: 'Verified badge', text: 'Stand out with a verified partner badge on your listing.' },
];

export default function Partner() {
  const [form, setForm] = useState({ name: '', city: '', country: 'Kenya', phone: '', email: '', website: '', price_from: '', description: '' });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.city) return;
    setBusy(true);
    await submitPartner({ ...form, price_from: form.price_from ? Number(form.price_from) : null });
    setBusy(false);
    setSent(true);
  };

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <DetailHeader title="Become a Partner" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          <View style={{ width: 82, height: 82, borderRadius: 41, backgroundColor: C.go + '1F', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={44} color={C.go} />
          </View>
          <Txt f={font.black} size={22} color={C.ink} align="center" style={{ marginTop: 18 }}>
            Application received!
          </Txt>
          <Txt f={font.body} size={13.5} color={C.textSub} align="center" style={{ marginTop: 8, lineHeight: 20 }}>
            Thanks for your interest in GoDriving. Our team will review your school and reach out within a few days.
          </Txt>
          <GradientButton title="Back to home" icon="home" onPress={() => router.push('/(tabs)')} style={{ marginTop: 24 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <DetailHeader title="Become a Partner" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Txt f={font.black} size={24} color={C.ink}>
          Grow your driving school
        </Txt>
        <Txt f={font.body} size={13.5} color={C.textSub} style={{ marginTop: 6, lineHeight: 20 }}>
          Join GoDriving's partner network and connect with new drivers across Africa.
        </Txt>

        <View style={{ marginTop: 16, gap: 10 }}>
          {PERKS.map((p) => (
            <Card key={p.title} pad={14}>
              <Row gap={12}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: C.brandMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={p.icon as any} size={20} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt f={font.bold} size={14.5} color={C.ink}>
                    {p.title}
                  </Txt>
                  <Txt f={font.body} size={12} color={C.textSub} style={{ marginTop: 2, lineHeight: 17 }}>
                    {p.text}
                  </Txt>
                </View>
              </Row>
            </Card>
          ))}
        </View>

        <Card style={{ marginTop: 18 }} pad={16}>
          <Txt f={font.bold} size={16} color={C.ink} style={{ marginBottom: 12 }}>
            Apply now
          </Txt>
          <Field label="School name *" value={form.name} onChangeText={set('name')} placeholder="e.g. Nairobi Safe Drivers" />
          <Field label="City *" value={form.city} onChangeText={set('city')} placeholder="e.g. Nairobi" />

          <Txt f={font.bodySemi} size={12} color={C.subInk} style={{ marginBottom: 6 }}>
            Country
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
            {COUNTRIES.map((c) => {
              const active = form.country === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => set('country')(c)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: active ? C.brand : C.card2, borderWidth: 1, borderColor: active ? C.brand : C.line }}>
                  <Txt f={font.bodySemi} size={12.5} color={active ? C.white : C.textSub}>
                    {c}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>

          <Field label="Phone" value={form.phone} onChangeText={set('phone')} placeholder="+254 …" keyboardType="phone-pad" />
          <Field label="Email" value={form.email} onChangeText={set('email')} placeholder="you@school.co.ke" keyboardType="email-address" />
          <Field label="Website" value={form.website} onChangeText={set('website')} placeholder="www.school.co.ke" />
          <Field label="Price from (per course)" value={form.price_from} onChangeText={set('price_from')} placeholder="e.g. 12000" keyboardType="numeric" />
          <Field label="Description" value={form.description} onChangeText={set('description')} placeholder="Tell learners about your school" multiline />

          <GradientButton title={busy ? 'Submitting…' : 'Submit application'} icon="send" onPress={submit} style={{ marginTop: 8 }} />
        </Card>
      </ScrollView>
    </View>
  );
}

function Field({ label, multiline, ...rest }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Txt f={font.bodySemi} size={12} color={C.subInk} style={{ marginBottom: 6 }}>
        {label}
      </Txt>
      <TextInput
        {...rest}
        placeholderTextColor={C.muted}
        multiline={multiline}
        style={{
          backgroundColor: C.card2,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontFamily: font.body,
          fontSize: 14,
          color: C.ink,
          minHeight: multiline ? 72 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}
