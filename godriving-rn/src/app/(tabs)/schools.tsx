import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { fetchSchools, submitLead } from '@/data/api';
import type { School } from '@/data/types';
import { TopBar } from '@/components/shared';
import { useGD } from '@/store';
import { C, font, radius, shadow } from '@/theme';
import { Avatar, Badge, Card, GradientButton, Row, Txt } from '@/ui';

const COUNTRIES = ['All', 'Kenya', 'Uganda', 'Tanzania', 'Rwanda'];

export default function Schools() {
  const { user } = useGD();
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('All');
  const [schools, setSchools] = useState<School[] | null>(null);
  const [lead, setLead] = useState<School | null>(null);

  useEffect(() => {
    let alive = true;
    setSchools(null);
    const t = setTimeout(() => {
      fetchSchools(q || undefined, country === 'All' ? undefined : country).then((s) => {
        if (alive) setSchools(s);
      });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, country]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar subtitle="Driving school directory" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Txt f={font.black} size={24} color={C.ink}>
          Find a driving school
        </Txt>
        <Txt f={font.body} size={13} color={C.textSub} style={{ marginTop: 4, lineHeight: 19 }}>
          Verified partner schools across East Africa. Get connected in minutes.
        </Txt>

        {/* Search */}
        <Row gap={8} style={{ marginTop: 14, backgroundColor: C.card, borderRadius: radius.pill, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, height: 46 }}>
          <Ionicons name="search" size={18} color={C.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search by name or city"
            placeholderTextColor={C.muted}
            style={{ flex: 1, fontFamily: font.body, fontSize: 14, color: C.ink }}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={C.muted} />
            </Pressable>
          ) : null}
        </Row>

        {/* Country filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8 }}>
          {COUNTRIES.map((c) => {
            const active = country === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCountry(c)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: active ? C.brand : C.card, borderWidth: 1, borderColor: active ? C.brand : C.line }}>
                <Txt f={font.bodySemi} size={13} color={active ? C.white : C.textSub}>
                  {c}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Results */}
        {schools === null ? (
          <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} />
        ) : schools.length === 0 ? (
          <Card style={{ marginTop: 20, alignItems: 'center' }} pad={26}>
            <Ionicons name="school-outline" size={34} color={C.muted} />
            <Txt f={font.bold} size={15} color={C.ink} style={{ marginTop: 8 }}>
              No schools found
            </Txt>
            <Txt f={font.body} size={12.5} color={C.muted} align="center" style={{ marginTop: 4 }}>
              Try a different city or country.
            </Txt>
          </Card>
        ) : (
          <View style={{ marginTop: 16, gap: 12 }}>
            {schools.map((s) => (
              <Card key={s.id} pad={14}>
                <Row gap={12} style={{ alignItems: 'flex-start' }}>
                  {s.logo ? (
                    <Image source={{ uri: s.logo }} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: C.line2 }} />
                  ) : (
                    <Avatar name={s.name} size={52} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Row gap={6}>
                          <Txt f={font.bold} size={15} color={C.ink} numberOfLines={1} style={{ flexShrink: 1 }}>
                            {s.name}
                          </Txt>
                          {s.verified && <Ionicons name="checkmark-circle" size={15} color={C.brand} />}
                        </Row>
                        <Row gap={4} style={{ marginTop: 2 }}>
                          <Ionicons name="location" size={12} color={C.muted} />
                          <Txt f={font.body} size={12} color={C.muted}>
                            {s.city}, {s.country}
                          </Txt>
                        </Row>
                      </View>
                      {s.featured && <Badge label="Featured" bg={C.gold + '22'} color={C.gold} />}
                    </Row>
                    <Txt f={font.body} size={12.5} color={C.textSub} numberOfLines={2} style={{ marginTop: 8, lineHeight: 18 }}>
                      {s.description}
                    </Txt>
                    <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
                      <Row gap={10}>
                        <Row gap={3}>
                          <Ionicons name="star" size={13} color={C.gold} />
                          <Txt f={font.bodyBold} size={12.5} color={C.ink}>
                            {s.rating?.toFixed(1)}
                          </Txt>
                        </Row>
                        {s.price_from != null && (
                          <Txt f={font.body} size={12} color={C.muted}>
                            from {s.price_from.toLocaleString()}/-
                          </Txt>
                        )}
                      </Row>
                      <Pressable
                        onPress={() => setLead(s)}
                        style={{ backgroundColor: C.brand, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Txt f={font.bodyBold} size={12.5} color={C.white}>
                          Get connected
                        </Txt>
                        <Ionicons name="arrow-forward" size={13} color={C.white} />
                      </Pressable>
                    </Row>
                  </View>
                </Row>
              </Card>
            ))}
          </View>
        )}

        {/* Partner CTA */}
        <Pressable onPress={() => router.push('/partner')} style={{ marginTop: 18 }}>
          <Card style={{ alignItems: 'center', backgroundColor: C.brandMuted, borderColor: C.brand + '33' }} pad={18}>
            <Txt f={font.bold} size={15} color={C.brand}>
              Own a driving school?
            </Txt>
            <Txt f={font.body} size={12.5} color={C.subInk} align="center" style={{ marginTop: 4 }}>
              Apply to become a GoDriving partner →
            </Txt>
          </Card>
        </Pressable>
      </ScrollView>

      <LeadModal school={lead} onClose={() => setLead(null)} defaultName={user?.name} defaultEmail={user?.email} />
    </View>
  );
}

function LeadModal({ school, onClose, defaultName, defaultEmail }: { school: School | null; onClose: () => void; defaultName?: string; defaultEmail?: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (school) {
      setName(defaultName ?? '');
      setEmail(defaultEmail ?? '');
      setPhone('');
      setMessage(`Hi, I'd like to enroll at ${school.name}.`);
      setSent(false);
    }
  }, [school]);

  const send = async () => {
    if (!school || !name || !email) return;
    setBusy(true);
    await submitLead({ school_id: school.id, name, email, phone, message });
    setBusy(false);
    setSent(true);
  };

  return (
    <Modal visible={!!school} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#00000077', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, ...shadow.soft }}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <Txt f={font.bold} size={18} color={C.ink}>
              {sent ? 'Request sent!' : 'Get connected'}
            </Txt>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={C.muted} />
            </Pressable>
          </Row>

          {sent ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.go + '1F', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark" size={34} color={C.go} />
              </View>
              <Txt f={font.body} size={13.5} color={C.textSub} align="center" style={{ marginTop: 14, lineHeight: 20 }}>
                {school?.name} has received your request and will reach out to you soon. Good luck on the road!
              </Txt>
              <GradientButton title="Done" onPress={onClose} style={{ alignSelf: 'stretch', marginTop: 20 }} />
            </View>
          ) : (
            <>
              <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
              <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" />
              <Field label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="+254 …" keyboardType="phone-pad" />
              <Field label="Message" value={message} onChangeText={setMessage} placeholder="" multiline />
              <GradientButton title={busy ? 'Sending…' : 'Send request'} icon="send" onPress={send} style={{ marginTop: 16 }} />
            </>
          )}
        </View>
      </View>
    </Modal>
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
          backgroundColor: C.card,
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
