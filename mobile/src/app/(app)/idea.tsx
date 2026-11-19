import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { request } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { platformLabel } from '../../onboarding/api';
import type { OnboardingState, Options } from '../../onboarding/api';
import { Celebration, StepHero } from '../../onboarding/delight';
import { Chip } from '../../onboarding/components';
import PublishPanel from '../../create/PublishPanel';
import type { Account } from '../../create/PublishPanel';
import { Button, Card, ErrorText, FadeIn, Field, Screen } from '../../ui';
import { colors, platformColors, radius } from '../../theme';

type Stage = 'write' | 'pick' | 'publish' | 'done';
type Suggest = { platform: string; options: string[] };
type Saved = { id: string };

const FALLBACK_PLATFORMS = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'];
const LIMITS: Record<string, number> = { TWITTER: 280, BLUESKY: 300, THREADS: 500, INSTAGRAM: 2200, LINKEDIN: 3000, TIKTOK: 2200, YOUTUBE: 5000 };

export default function Idea() {
  const router = useRouter();
  const { workspace } = useAuth();
  const wid = workspace?.id;

  const [stage, setStage] = useState<Stage>('write');
  const [idea, setIdea] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(FALLBACK_PLATFORMS);
  const [platform, setPlatform] = useState(FALLBACK_PLATFORMS[0]);
  const [chips, setChips] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneNote, setDoneNote] = useState('');

  // Quietly pick up what we know about the business: its channels, and example ideas for its kind of business.
  useEffect(() => {
    if (!wid) return;
    let cancelled = false;
    Promise.allSettled([
      request<Options>('/mobile/v1/onboarding/options'),
      request<OnboardingState>(`/mobile/v1/workspaces/${wid}/onboarding`),
      request<{ accounts: Account[] }>(`/mobile/v1/workspaces/${wid}/home`),
    ]).then(([o, s, h]) => {
      if (cancelled) return;
      const profile = s.status === 'fulfilled' ? s.value.profile : null;
      if (profile?.platforms?.length) {
        setPlatforms(profile.platforms);
        setPlatform(profile.platforms[0]);
      }
      if (o.status === 'fulfilled' && profile?.category) {
        setChips(o.value.categories.find((c) => c.id === profile.category)?.ideaChips ?? []);
      }
      if (h.status === 'fulfilled') setAccounts(h.value.accounts ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [wid]);

  const write = useCallback(async () => {
    if (!wid) return;
    setBusy(true);
    setError(null);
    try {
      const r = await request<Suggest>(`/mobile/v1/workspaces/${wid}/create/suggest`, {
        method: 'POST',
        body: { idea: idea.trim(), platform },
      });
      setOptions(r.options);
      setPicked(0);
      setText(r.options[0] ?? '');
      setStage('pick');
    } catch (err: any) {
      setError(err?.message || 'We could not write that one. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [wid, idea, platform]);

  const finish = useCallback(
    async (accountId?: string, status?: 'DRAFT' | 'SCHEDULED', scheduledAt?: string) => {
      if (!wid) return;
      setBusy(true);
      setError(null);
      let saved: Saved | null = null;
      try {
        saved = await request<Saved>(`/mobile/v1/workspaces/${wid}/ideas`, {
          method: 'POST',
          body: { idea: idea.trim(), content: text.trim(), platform },
        });
        if (accountId && status) {
          await request(`/mobile/v1/workspaces/${wid}/ideas/${saved.id}/post`, {
            method: 'POST',
            body: { socialAccountId: accountId, status, ...(scheduledAt ? { scheduledAt } : {}) },
          });
          setDoneNote(status === 'SCHEDULED' ? 'Scheduled. It will go out on time.' : 'Saved as a draft in Posts.');
        } else {
          setDoneNote(
            accounts.length === 0
              ? 'Kept safe in your ideas. Connect an account and it can go out.'
              : 'Kept in your ideas for later.',
          );
        }
        setStage('done');
      } catch (err: any) {
        // The text is already safe on the shelf if the first call worked; say so instead of losing it.
        setError(
          saved
            ? `Your post is saved in your ideas, but we could not schedule it: ${err?.message || 'please try again'}`
            : err?.message || 'Could not save. Please try again.',
        );
      } finally {
        setBusy(false);
      }
    },
    [wid, idea, text, platform, accounts.length],
  );

  const reset = () => {
    setIdea('');
    setOptions([]);
    setText('');
    setError(null);
    setStage('write');
  };

  const limit = LIMITS[platform] ?? 2200;
  const color = platformColors[platform] ?? colors.primaryBright;

  const top = (
    <View style={styles.top}>
      <Pressable
        hitSlop={12}
        onPress={() => {
          if (stage === 'write' || stage === 'done') router.back();
          else setStage(stage === 'publish' ? 'pick' : 'write');
          setError(null);
        }}
      >
        <Text style={styles.back}>{stage === 'write' || stage === 'done' ? '✕  Close' : '‹  Back'}</Text>
      </Pressable>
    </View>
  );

  if (stage === 'write') {
    return (
      <Screen>
        {top}
        <StepHero
          icon="✎"
          kicker="Write an idea"
          title="What would you like to post about?"
          sub="A sentence is enough. We write three posts in your voice."
        />
        <Field
          label="Your idea"
          value={idea}
          onChangeText={setIdea}
          autoCapitalize="sentences"
          multiline
          maxLength={600}
          style={{ minHeight: 110, textAlignVertical: 'top' }}
          placeholder="We have fresh red velvet cakes this weekend"
        />
        {chips.length > 0 ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.cap}>Need a spark?</Text>
            <View style={styles.wrap}>
              {chips.map((c) => (
                <Chip key={c} label={c} onPress={() => setIdea(c)} />
              ))}
            </View>
          </View>
        ) : null}
        <Text style={styles.cap}>For</Text>
        <View style={styles.wrap}>
          {platforms.map((p) => (
            <Chip key={p} label={platformLabel(p)} selected={platform === p} onPress={() => setPlatform(p)} />
          ))}
        </View>
        <ErrorText>{error}</ErrorText>
        <Button
          title={busy ? 'Writing your post...' : 'Write my post'}
          onPress={() => void write()}
          loading={busy}
          disabled={idea.trim().length < 3}
        />
      </Screen>
    );
  }

  if (stage === 'pick') {
    return (
      <Screen>
        {top}
        <StepHero
          icon="✧"
          kicker="Three ways to say it"
          title="Pick the one you like"
          sub="Tap one, then change anything you want."
          tint={colors.accent}
          soft={colors.accentSoft}
        />
        {options.map((o, i) => {
          const on = i === picked;
          return (
            <FadeIn key={i} delay={i * 90}>
              <Pressable
                onPress={() => {
                  setPicked(i);
                  setText(o);
                }}
                style={[styles.option, on && { borderColor: color, backgroundColor: colors.cardAlt }]}
              >
                <View style={[styles.stripe, { backgroundColor: on ? color : colors.border }]} />
                <Text style={styles.optionText}>{o}</Text>
              </Pressable>
            </FadeIn>
          );
        })}
        <Field
          label={`Edit before you save (${text.length}/${limit})`}
          value={text}
          onChangeText={setText}
          autoCapitalize="sentences"
          multiline
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />
        <ErrorText>{text.length > limit ? `This is too long for ${platformLabel(platform)}. Shorten it a little.` : null}</ErrorText>
        <Button title="Use this post" onPress={() => setStage('publish')} disabled={!text.trim() || text.length > limit} />
        <Button title="Write different ones" variant="secondary" onPress={() => void write()} loading={busy} />
        <ErrorText>{error}</ErrorText>
      </Screen>
    );
  }

  if (stage === 'publish') {
    return (
      <Screen>
        {top}
        <StepHero
          icon="◷"
          kicker="Almost there"
          title={accounts.length > 0 ? 'When should it go out?' : 'Keep it safe for now'}
          sub={accounts.length > 0 ? 'Choose where and when. You can change it later.' : 'You have no connected account yet. We will keep this in your ideas until you do.'}
          tint={colors.ok}
          soft={colors.okSoft}
        />
        <Card tone="primary">
          <Text style={styles.preview}>{text}</Text>
        </Card>
        <ErrorText>{error}</ErrorText>
        {accounts.length > 0 ? (
          <>
            <PublishPanel accounts={accounts} busy={busy} onConfirm={(a, s, at) => void finish(a, s, at)} />
            <Button title="Just save to my ideas" variant="link" onPress={() => void finish()} />
          </>
        ) : (
          <Button title="Save to my ideas" onPress={() => void finish()} loading={busy} />
        )}
      </Screen>
    );
  }

  // done
  return (
    <Screen>
      {top}
      <Celebration />
      <FadeIn delay={150}>
        <Text style={styles.doneTitle}>Nicely done</Text>
        <Text style={styles.doneSub}>{doneNote}</Text>
      </FadeIn>
      <FadeIn delay={300}>
        <Button title="Write another" onPress={reset} />
        <Button title="See my ideas" variant="secondary" onPress={() => router.replace('/ideas' as Href)} />
        <Button title="Back to home" variant="link" onPress={() => router.replace('/home' as Href)} />
      </FadeIn>
      {busy ? <ActivityIndicator color={colors.primaryBright} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  back: { color: colors.primaryBright, fontSize: 15, fontWeight: '600' },
  cap: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  option: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginBottom: 12,
    overflow: 'hidden',
  },
  stripe: { width: 5 },
  optionText: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 22, padding: 14 },
  preview: { color: colors.text, fontSize: 15, lineHeight: 23 },
  doneTitle: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center', marginBottom: 8 },
  doneSub: { color: colors.muted, fontSize: 16, lineHeight: 24, textAlign: 'center', marginBottom: 24 },
});
