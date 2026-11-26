import React, { useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/api/supabase';
import { ageFromBirthDate } from '@/shared/lib/age';
import { Btn, Card, Muted } from '@/components/ui';
import { colors, radius } from '@/shared/theme';

type Prof = { id: string; first_name: string; birth_date: string; city: string | null; bio: string | null; photos: string[] };
const W = Dimensions.get('window').width - 36;

export default function FriendProfile() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [p, setP] = useState<Prof | null | undefined>(undefined);
  const [answers, setAnswers] = useState<{ prompt: string; answer: string }[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('id,first_name,birth_date,city,bio,photos').eq('id', id).maybeSingle();
      setP((data as Prof) ?? null);
      const { data: a } = await supabase.from('profile_answers').select('answer,position,prompts(text_sv)').eq('profile_id', id).order('position');
      setAnswers((a ?? []).map((x: any) => ({ prompt: x.prompts?.text_sv ?? '', answer: x.answer })));
    })();
  }, [id]);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 18, paddingTop: 8, paddingBottom: 40 }}>
      <Btn kind="ghost" icon="back" label={t('common.back')} onPress={() => router.back()} style={{ alignSelf: 'flex-start', marginBottom: 8 }} />
      {p === null && <Muted>{t('friends.notFound')}</Muted>}
      {p && (
        <View>
          <View style={{ borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.primarySoft }}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width: W }}
              onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / W))}>
              {p.photos.map((u) => <Image key={u} source={{ uri: u }} style={{ width: W, height: W * 1.3 }} resizeMode="cover" />)}
            </ScrollView>
            {p.photos.length > 1 && (
              <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                {p.photos.map((u, i) => <View key={u} style={{ width: i === page ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: i === page ? '#fff' : '#ffffff99' }} />)}
              </View>
            )}
          </View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 18 }}>{p.first_name}, {ageFromBirthDate(p.birth_date)}</Text>
          {p.city ? <Muted style={{ marginBottom: 8 }}>{p.city}</Muted> : null}
          {p.bio ? <Text style={{ fontSize: 16, lineHeight: 24, color: colors.text, marginBottom: 18 }}>{p.bio}</Text> : null}
          {answers.map((a) => (
            <Card key={a.prompt}>
              <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 4 }}>{a.prompt}</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, lineHeight: 28 }}>{a.answer}</Text>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
