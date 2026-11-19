import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { request } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Body, Button, Card, ErrorText, Field, Screen, Title } from '../ui';
import { colors } from '../theme';
import { Chip, Choice, Progress } from './components';
import { markSkipped } from './session';
import { platformLabel } from './api';
import type { AnalyzeResponse, OnboardingState, Options } from './api';

type Step =
  | 'name'
  | 'category'
  | 'website'
  | 'review'
  | 'about'
  | 'audience'
  | 'frequency'
  | 'platforms'
  | 'voice'
  | 'topics'
  | 'done';

const PROGRESS: Record<Step, number> = {
  name: 1,
  category: 2,
  website: 3,
  review: 4,
  about: 4,
  audience: 5,
  frequency: 5,
  platforms: 6,
  voice: 7,
  topics: 8,
  done: 9,
};

type Form = {
  businessName: string;
  category: string;
  website: string;
  description: string;
  audience: string;
  offerings: string[];
  tone: string;
  brandColors: string[];
  language: string;
  frequency: string;
  platforms: string[];
  contentTypes: string[];
};

const EMPTY: Form = {
  businessName: '',
  category: '',
  website: '',
  description: '',
  audience: '',
  offerings: [],
  tone: '',
  brandColors: [],
  language: '',
  frequency: 'FEW_PER_WEEK',
  platforms: [],
  contentTypes: [],
};

export default function Wizard() {
  const router = useRouter();
  const { workspace } = useAuth();
  const wid = workspace?.id;

  const [options, setOptions] = useState<Options | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [step, setStep] = useState<Step>('name');
  const [history, setHistory] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const load = useCallback(async () => {
    if (!wid) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [opts, state] = await Promise.all([
        request<Options>('/mobile/v1/onboarding/options'),
        request<OnboardingState>(`/mobile/v1/workspaces/${wid}/onboarding`),
      ]);
      setOptions(opts);
      const p = state.profile;
      setForm({
        ...EMPTY,
        businessName: state.businessName ?? '',
        category: p?.category ?? '',
        website: p?.website ?? '',
        description: p?.description ?? '',
        audience: p?.audience ?? '',
        offerings: p?.offerings ?? [],
        tone: p?.tone ?? '',
        brandColors: p?.brandColors ?? [],
        language: p?.language ?? '',
        frequency: p?.postingFrequency ?? 'FEW_PER_WEEK',
        platforms: p?.platforms ?? [],
        contentTypes: p?.contentTypes ?? [],
      });
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load the setup. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [wid]);

  useEffect(() => {
    void load();
  }, [load]);

  const go = (next: Step) => {
    setHistory((h) => [...h, step]);
    setStep(next);
    setError(null);
  };

  const back = () => {
    const prev = history[history.length - 1];
    if (prev) {
      setHistory(history.slice(0, -1));
      setStep(prev);
      setError(null);
    }
  };

  const skip = () => {
    markSkipped();
    router.replace('/home' as Href);
  };

  const category = options?.categories.find((c) => c.id === form.category) ?? null;

  const toggle = (key: 'platforms' | 'contentTypes', value: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  // ---- server calls -------------------------------------------------------

  const scan = async () => {
    if (!wid) return;
    setBusy(true);
    setError(null);
    try {
      const r = await request<AnalyzeResponse>(`/mobile/v1/workspaces/${wid}/onboarding/analyze-website`, {
        method: 'POST',
        body: { website: form.website },
      });
      const f = r.found;
      setForm((cur) => ({
        ...cur,
        website: r.website,
        description: f.description ?? cur.description,
        audience: f.audience ?? cur.audience,
        offerings: f.offerings.length ? f.offerings : cur.offerings,
        tone: cur.tone || f.tone || '',
        brandColors: f.brandColors.length ? f.brandColors : r.siteThemeColor ? [r.siteThemeColor] : cur.brandColors,
        language: f.language ?? cur.language,
      }));
      go('review');
    } catch (err: any) {
      setError(err?.message || 'We could not read that website. You can type your details in instead.');
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (next: Step) => {
    if (!wid) return;
    setBusy(true);
    setError(null);
    try {
      await request(`/mobile/v1/workspaces/${wid}/onboarding/profile`, {
        method: 'PUT',
        body: {
          businessName: form.businessName,
          category: form.category,
          ...(form.website ? { website: form.website } : {}),
          description: form.description,
          audience: form.audience,
          offerings: form.offerings,
          ...(form.tone ? { tone: form.tone } : {}),
          brandColors: form.brandColors,
          ...(form.language ? { language: form.language } : {}),
        },
      });
      go(next);
    } catch (err: any) {
      setError(err?.message || 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!wid) return;
    setBusy(true);
    setError(null);
    try {
      await request(`/mobile/v1/workspaces/${wid}/onboarding/preferences`, {
        method: 'PUT',
        body: {
          postingFrequency: form.frequency,
          platforms: form.platforms,
          tone: form.tone || 'FRIENDLY',
          contentTypes: form.contentTypes,
        },
      });
      go('done');
    } catch (err: any) {
      setError(err?.message || 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // ---- render -------------------------------------------------------------

  if (loading) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primaryBright} size="large" />
        </View>
      </Screen>
    );
  }

  if (loadError || !options) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Title>Something went wrong</Title>
          <ErrorText>{loadError}</ErrorText>
          <Button title="Try again" onPress={() => void load()} />
          <Button title="Skip for now" variant="link" onPress={skip} />
        </View>
      </Screen>
    );
  }

  const header = (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        {step !== 'name' && step !== 'done' ? (
          <Pressable onPress={back} hitSlop={12}>
            <Text style={{ color: colors.primaryBright, fontSize: 15, fontWeight: '600' }}>Back</Text>
          </Pressable>
        ) : (
          <View />
        )}
        {step !== 'done' ? (
          <Pressable onPress={skip} hitSlop={12}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>Skip for now</Text>
          </Pressable>
        ) : null}
      </View>
      <Progress step={PROGRESS[step]} total={9} />
    </View>
  );

  const nextButton = (title: string, onPress: () => void, disabled?: boolean) => (
    <View style={{ marginTop: 8 }}>
      <ErrorText>{error}</ErrorText>
      <Button title={title} onPress={onPress} loading={busy} disabled={disabled} />
    </View>
  );

  if (step === 'name') {
    return (
      <Screen>
        {header}
        <Title>Let us set up your social media</Title>
        <Body>A few quick questions so everything we write sounds like you. It takes about 2 minutes.</Body>
        <Field
          label="What is your business called?"
          value={form.businessName}
          onChangeText={(v) => set('businessName', v)}
          autoCapitalize="words"
          placeholder="Ada's Bakery"
        />
        {nextButton('Continue', () => go('category'), !form.businessName.trim())}
      </Screen>
    );
  }

  if (step === 'category') {
    return (
      <Screen>
        {header}
        <Title>What kind of business is it?</Title>
        <Body>Pick the closest one. We use it to suggest the right things to post.</Body>
        {options.categories.map((c) => (
          <Choice key={c.id} label={c.label} selected={form.category === c.id} onPress={() => set('category', c.id)} />
        ))}
        {nextButton('Continue', () => go('website'), !form.category)}
      </Screen>
    );
  }

  if (step === 'website') {
    return (
      <Screen>
        {header}
        <Title>Do you have a website?</Title>
        <Body>We can read it and fill in the rest for you, so you do not have to type it all. You will check it before anything is saved.</Body>
        <Field
          label="Website (optional)"
          value={form.website}
          onChangeText={(v) => set('website', v)}
          keyboardType="url"
          placeholder="www.mybusiness.com"
        />
        <ErrorText>{error}</ErrorText>
        <Button
          title={busy ? 'Reading your website...' : 'Read my website'}
          onPress={() => void scan()}
          loading={busy}
          disabled={!form.website.trim()}
        />
        <Button
          title="I do not have one, I will type it in"
          variant="link"
          onPress={() => {
            set('website', '');
            go('about');
          }}
        />
      </Screen>
    );
  }

  if (step === 'review') {
    return (
      <Screen>
        {header}
        <Title>Here is what we found</Title>
        <Body>Does this sound like your business?</Body>
        <Card>
          <Text style={{ color: colors.text, fontSize: 16, lineHeight: 23 }}>{form.description || 'No description found.'}</Text>
        </Card>
        {form.offerings.length > 0 ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>What you offer</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {form.offerings.map((o) => (
                <Chip key={o} label={o} />
              ))}
            </View>
          </View>
        ) : null}
        {form.audience ? (
          <Card>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Your customers</Text>
            <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{form.audience}</Text>
          </Card>
        ) : null}
        <ErrorText>{error}</ErrorText>
        <Button title="Yes, that is right" onPress={() => void saveProfile('frequency')} loading={busy} />
        <Button title="Let me change something" variant="secondary" onPress={() => go('about')} />
      </Screen>
    );
  }

  if (step === 'about') {
    return (
      <Screen>
        {header}
        <Title>What does your business do?</Title>
        <Body>One or two sentences is plenty.</Body>
        <Field
          label="About your business"
          value={form.description}
          onChangeText={(v) => set('description', v)}
          autoCapitalize="sentences"
          multiline
          style={{ minHeight: 100, textAlignVertical: 'top' }}
          placeholder="We bake fresh bread and custom cakes for families in Lagos."
        />
        {nextButton('Continue', () => go('audience'), !form.description.trim())}
      </Screen>
    );
  }

  if (step === 'audience') {
    const examples = category?.audienceExamples ?? [];
    return (
      <Screen>
        {header}
        <Title>Who are your customers?</Title>
        <Body>Tap an example to start, or write your own.</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {examples.map((e) => (
            <Chip key={e} label={e} selected={form.audience === e} onPress={() => set('audience', e)} />
          ))}
        </View>
        <Field
          label="Your customers"
          value={form.audience}
          onChangeText={(v) => set('audience', v)}
          autoCapitalize="sentences"
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
          placeholder="Families and office workers nearby"
        />
        {nextButton('Continue', () => void saveProfile('frequency'), !form.audience.trim())}
      </Screen>
    );
  }

  if (step === 'frequency') {
    return (
      <Screen>
        {header}
        <Title>How often do you want to post?</Title>
        <Body>You can change this any time.</Body>
        {options.frequencies.map((f) => (
          <Choice key={f.id} label={f.label} hint={f.hint} selected={form.frequency === f.id} onPress={() => set('frequency', f.id)} />
        ))}
        {nextButton('Continue', () => go('platforms'))}
      </Screen>
    );
  }

  if (step === 'platforms') {
    return (
      <Screen>
        {header}
        <Title>Where do you want to post?</Title>
        <Body>Pick all that you use. You will connect them in a moment, or later.</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {options.platforms.map((p) => (
            <Chip key={p} label={platformLabel(p)} selected={form.platforms.includes(p)} onPress={() => toggle('platforms', p)} />
          ))}
        </View>
        {nextButton('Continue', () => go('voice'))}
      </Screen>
    );
  }

  if (step === 'voice') {
    return (
      <Screen>
        {header}
        <Title>How should your posts sound?</Title>
        <Body>Here is the same message in each style, written for your business.</Body>
        {options.tones.map((t) => (
          <Choice
            key={t.id}
            label={t.label}
            hint={category?.toneSamples[t.id] ?? ''}
            selected={form.tone === t.id}
            onPress={() => set('tone', t.id)}
          />
        ))}
        {nextButton('Continue', () => go('topics'), !form.tone)}
      </Screen>
    );
  }

  if (step === 'topics') {
    const types = category?.contentTypes ?? [];
    return (
      <Screen>
        {header}
        <Title>What would you like to post about?</Title>
        <Body>Pick a few. We will suggest ideas around these.</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {types.map((t) => (
            <Chip key={t} label={t} selected={form.contentTypes.includes(t)} onPress={() => toggle('contentTypes', t)} />
          ))}
        </View>
        {nextButton('Finish setup', () => void finish(), form.contentTypes.length === 0)}
      </Screen>
    );
  }

  // done
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {header}
        <Title>You are all set</Title>
        <Body>
          Thank you. We now know {form.businessName || 'your business'}, who your customers are and how you like to sound.
        </Body>
        <Card>
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6 }}>Coming next</Text>
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>
            In the next update you will give us a photo or one sentence and we will write your first post for you to approve.
          </Text>
        </Card>
        <Button title="Go to my home screen" onPress={() => router.replace('/home' as Href)} />
      </View>
    </Screen>
  );
}
