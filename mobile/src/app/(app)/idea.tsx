import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Text } from '../../ui';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
import { ActionRow, ActionTile } from '../../actions';
import AiInfo, { LimitNote } from '../../create/AiInfo';
import type { IdeaUsage } from '../../create/AiInfo';
import { pickPhoto, uploadPhoto } from '../../create/media';
import { colors, platformColors, radius } from '../../theme';

type Stage = 'write' | 'pick' | 'publish' | 'done';
type Suggest = { platform: string; options: string[]; usage?: IdeaUsage | null };
type Saved = { id: string };

const FALLBACK_PLATFORMS = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'];
// Steers "write different ones". The ids are what the API understands.
const HINTS = [
  { id: 'SHORTER', label: 'Shorter' },
  { id: 'LONGER', label: 'Longer' },
  { id: 'FUNNIER', label: 'Funnier' },
  { id: 'MORE_FORMAL', label: 'More formal' },
  { id: 'MORE_FRIENDLY', label: 'More friendly' },
];
const LIMITS: Record<string, number> = { TWITTER: 280, BLUESKY: 300, THREADS: 500, INSTAGRAM: 2200, LINKEDIN: 3000, TIKTOK: 2200, YOUTUBE: 5000 };

export default function Idea() {
  const router = useRouter();
  const { workspace } = useAuth();
  const wid = workspace?.id;

  // Coming back from Connect (or anywhere): always show the accounts as they are now.
  useFocusEffect(
    useCallback(() => {
      if (!wid) return;
      request<{ accounts: Account[] }>(`/mobile/v1/workspaces/${wid}/home`)
        .then((h) => setAccounts(h.accounts ?? []))
        .catch(() => {});
    }, [wid]),
  );

  const [stage, setStage] = useState<Stage>('write');
  const scroller = useRef<{ scrollTo: (o: { y: number; animated?: boolean }) => void }>(null);
  const [editY, setEditY] = useState(0);
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
  const { photo: openPhoto } = useLocalSearchParams<{ photo?: string }>();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [usage, setUsage] = useState<IdeaUsage | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const autoOpened = useRef(false);

  const choosePhoto = useCallback(
    async (source: 'library' | 'camera') => {
      if (!wid) return;
      setError(null);
      try {
        const picked = await pickPhoto(source);
        if (!picked) return;
        setPhotoUri(picked.uri);
        setPhotoUrl(null);
        setUploading(true);
        setPhotoUrl(await uploadPhoto(wid, picked));
      } catch (err: any) {
        setPhotoUri(null);
        setPhotoUrl(null);
        setError(err?.message || 'We could not add that photo. Please try again.');
      } finally {
        setUploading(false);
      }
    },
    [wid],
  );

  const removePhoto = () => {
    setPhotoUri(null);
    setPhotoUrl(null);
  };

  // "Upload a photo" in the create sheet opens this screen straight in the gallery.
  useEffect(() => {
    if (openPhoto === '1' && wid && !autoOpened.current) {
      autoOpened.current = true;
      void choosePhoto('library');
    }
  }, [openPhoto, wid, choosePhoto]);

  // How many AI writes are left this month, for the "?" beside the AI actions.
  useEffect(() => {
    if (!wid) return;
    request<IdeaUsage>(`/mobile/v1/workspaces/${wid}/create/usage`)
      .then(setUsage)
      .catch(() => {});
  }, [wid]);

  // Out of AI writes: carry on by hand with the idea as the starting text.
  const writeMyself = () => {
    setOptions([]);
    setText(idea.trim() === 'Photo post' ? '' : idea.trim());
    setLimitHit(false);
    setStage('pick');
  };

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

  const write = useCallback(
    async (nextHint?: string) => {
      if (!wid || busy) return;
      setBusy(true);
      setError(null);
      setLimitHit(false);
      try {
        const r = await request<Suggest>(`/mobile/v1/workspaces/${wid}/create/suggest`, {
          method: 'POST',
          body: {
            idea: idea.trim() || 'Photo post',
            platform,
            ...(photoUrl ? { imageUrl: photoUrl } : {}),
            ...(nextHint ? { hint: nextHint } : {}),
          },
        });
        setOptions(r.options);
        setPicked(0);
        setText(r.options[0] ?? '');
        if (r.usage) setUsage(r.usage);
        setStage('pick');
      } catch (err: any) {
        // Out of AI writes: explain calmly instead of showing an error.
        if (err?.status === 403 && /limit|plan/i.test(String(err?.message))) {
          setLimitHit(true);
          request<IdeaUsage>(`/mobile/v1/workspaces/${wid}/create/usage`)
            .then(setUsage)
            .catch(() => {});
        } else {
          setError(err?.message || 'We could not write that one. Please try again.');
        }
      } finally {
        setBusy(false);
      }
    },
    [wid, busy, idea, platform, photoUrl],
  );

  const finish = useCallback(
    async (accountIds?: string[], status?: 'DRAFT' | 'SCHEDULED', scheduledAt?: string) => {
      if (!wid) return;
      setBusy(true);
      setError(null);
      let saved: Saved | null = null;
      try {
        saved = await request<Saved>(`/mobile/v1/workspaces/${wid}/ideas`, {
          method: 'POST',
          body: {
            idea: idea.trim() || 'Photo post',
            content: text.trim(),
            platform,
            ...(photoUrl ? { mediaUrls: [photoUrl] } : {}),
          },
        });
        if (accountIds && accountIds.length > 0 && status) {
          const r = await request<{ posts?: unknown[]; failed?: { message: string }[] }>(
            `/mobile/v1/workspaces/${wid}/ideas/${saved.id}/post`,
            {
              method: 'POST',
              body: { socialAccountIds: accountIds, status, ...(scheduledAt ? { scheduledAt } : {}) },
            },
          );
          const made = r.posts?.length ?? accountIds.length;
          let note =
            made > 1
              ? `${status === 'SCHEDULED' ? 'Scheduled' : 'Saved as drafts'} on ${made} accounts.`
              : status === 'SCHEDULED'
                ? 'Scheduled. It will go out on time.'
                : 'Saved as a draft in Posts.';
          if (r.failed && r.failed.length > 0) note += ` ${r.failed.length} did not go through: ${r.failed[0].message}`;
          setDoneNote(note);
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
    [wid, idea, text, platform, accounts.length, photoUrl],
  );

  const reset = () => {
    setIdea('');
    setPhotoUri(null);
    setPhotoUrl(null);
    setLimitHit(false);
    setOptions([]);
    setText('');
    setError(null);
    setStage('write');
  };

  const limit = LIMITS[platform] ?? 2200;
  // Every platform the business set up in onboarding, plus every platform it has connected since.
  const choices = Array.from(new Set([...platforms, ...accounts.map((a) => a.platform)]));
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
        <Text style={styles.cap}>Start with a photo (optional)</Text>
        {photoUri ? (
          <View style={styles.photoBox}>
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            {uploading ? (
              <View style={styles.photoOverlay}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.photoNote}>Uploading...</Text>
              </View>
            ) : null}
            <Pressable onPress={removePhoto} hitSlop={10} style={styles.photoX} accessibilityLabel="Remove photo">
              <Feather name="x" size={16} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <ActionRow>
            <ActionTile compact label="Gallery" icon={(c) => <Feather name="image" size={20} color={c} />} onPress={() => void choosePhoto('library')} />
            <ActionTile compact label="Camera" icon={(c) => <Feather name="camera" size={20} color={c} />} onPress={() => void choosePhoto('camera')} />
          </ActionRow>
        )}
        <Field
          label={photoUri ? 'Add a note (optional)' : 'Your idea'}
          value={idea}
          onChangeText={setIdea}
          autoCapitalize="sentences"
          multiline
          maxLength={600}
          style={{ minHeight: 110, textAlignVertical: 'top' }}
          placeholder={photoUri ? 'Anything we should mention about it?' : 'We have fresh red velvet cakes this weekend'}
        />
        {chips.length > 0 && !photoUri ? (
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
          {choices.map((p) => (
            <Chip key={p} label={platformLabel(p)} selected={platform === p} onPress={() => setPlatform(p)} />
          ))}
        </View>
        <ErrorText>{error}</ErrorText>
        {limitHit ? (
          <LimitNote usage={usage} onWriteMyself={writeMyself} />
        ) : (
          <>
            <Button
              title={busy ? 'Writing your post...' : photoUrl ? 'Write posts for my photo' : 'Write my post'}
              onPress={() => void write()}
              loading={busy}
              disabled={uploading || (idea.trim().length < 3 && !photoUrl)}
            />
            <AiInfo usage={usage} />
          </>
        )}
      </Screen>
    );
  }

  if (stage === 'pick') {
    return (
      <Screen scrollRef={scroller}>
        {top}
        <StepHero
          icon="✧"
          kicker={options.length > 0 ? 'Three ways to say it' : 'Your post'}
          title={options.length > 0 ? 'Pick the one you like' : 'Write your post'}
          sub={options.length > 0 ? 'Tap one, then change anything you want.' : 'Say it your way. You can change it any time.'}
          tint={colors.accent}
          soft={colors.accentSoft}
        />
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoSmall} resizeMode="cover" /> : null}
        {options.map((o, i) => {
          const on = i === picked;
          return (
            <FadeIn key={i} delay={i * 90}>
              <Pressable
                onPress={() => {
                  setPicked(i);
                  setText(o);
                  // First-time users should see where the chosen post went: take them to the editor.
                  scroller.current?.scrollTo({ y: Math.max(0, editY - 16), animated: true });
                }}
                style={[styles.option, on && { borderColor: color, backgroundColor: colors.cardAlt }]}
              >
                <View style={[styles.stripe, { backgroundColor: on ? color : colors.border }]} />
                <Text style={styles.optionText}>{o}</Text>
              </Pressable>
            </FadeIn>
          );
        })}
        <View onLayout={(e) => setEditY(e.nativeEvent.layout.y)}>
          <Field
            label={`Your post, change anything you like (${text.length}/${limit})`}
            value={text}
            onChangeText={setText}
            autoCapitalize="sentences"
            multiline
            style={{ minHeight: 120, textAlignVertical: 'top' }}
          />
        </View>
        <ErrorText>{text.length > limit ? `This is too long for ${platformLabel(platform)}. Shorten it a little.` : null}</ErrorText>
        <Button title="Use this post" onPress={() => setStage('publish')} disabled={!text.trim() || text.length > limit} />
        {limitHit ? <LimitNote usage={usage} onWriteMyself={() => setLimitHit(false)} /> : null}
        <Text style={styles.cap}>Not quite right? Try</Text>
        <View style={styles.wrap}>
          {HINTS.map((h) => (
            <Chip key={h.id} label={h.label} onPress={() => void write(h.id)} />
          ))}
        </View>
        <Button title="Write different ones" variant="secondary" onPress={() => void write()} loading={busy} />
        <AiInfo usage={usage} />
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
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoSmall} resizeMode="cover" /> : null}
          <Text style={styles.preview}>{text}</Text>
        </Card>
        <ErrorText>{error}</ErrorText>
        {accounts.length > 0 ? (
          <>
            <PublishPanel accounts={accounts} busy={busy} onConfirm={(a, s, at) => void finish(a, s, at)} />
            <Button title="Just save to my ideas" variant="link" onPress={() => void finish()} />
          </>
        ) : (
          <>
            <Button title="Save to my ideas" onPress={() => void finish()} loading={busy} />
            <Button title="Connect an account first" variant="link" onPress={() => router.navigate('/connect' as Href)} />
          </>
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
        <Button title="See my ideas" variant="secondary" onPress={() => router.navigate('/ideas' as Href)} />
        <Button title="Back to home" variant="link" onPress={() => router.navigate('/home' as Href)} />
      </FadeIn>
      {busy ? <ActivityIndicator color={colors.primaryBright} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  photoBox: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: 14, backgroundColor: colors.card },
  photo: { width: '100%', height: 220 },
  photoSmall: { width: '100%', height: 180, borderRadius: radius.md, marginBottom: 12 },
  photoOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoNote: { color: '#fff', fontSize: 14, fontWeight: '600' },
  photoX: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
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
