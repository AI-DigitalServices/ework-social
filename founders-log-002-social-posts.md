# eWork Social — Weekly Content Flywheel
## Week 2: Founder's Log #002 — "The Week the Hub Woke Up"

Source post: `eworksocial.com/blog/founders-log-002-the-week-the-hub-woke-up`

---

## 1. LinkedIn — 7 Posts From One Blog

Each post pulls one moment from the Founder's Log and stands alone. Post Monday–Friday plus two bonus slots across the following week, or spread across 7 of the next 10 business days.

### Post 1 — Biggest Surprise
> I thought the Engagement Hub was working.
>
> Then I noticed only one conversation had arrived — out of eight I'd sent over several days.
>
> No error. No alert. Everything looked connected. The conversations were arriving — and then disappearing before they could be seen.
>
> One configuration mismatch between how the database stored platform data and how it searched for it. Once I corrected it, every conversation that had been waiting showed up in the hub at once.
>
> The lesson for any founder building a client-facing tool: silent failures are the most expensive kind. The feature looks like it's working. Your client experience tells a different story.
>
> #BuildInPublic #SaaS #AfricanFounder

### Post 2 — Biggest Objection
> "The auto-responder replies twice to the same message — is that intentional?"
>
> It wasn't. And I fixed it this week.
>
> Instagram sends two separate signals for every DM — one the moment a conversation starts, another when the message arrives. The auto-responder was treating both as separate triggers.
>
> So users were getting the same reply twice in under a second. Clean on the back end. Embarrassing in practice.
>
> The fix: one signal handles the conversation. The other sends the reply. One trigger. One reply. On-brand, every time.
>
> For social media managers who rely on auto-responders to handle volume without sacrificing professionalism — the reply that goes out represents your client's voice. It has to be right the first time.
>
> #AgencyTools #InstagramMarketing #eWorkSocial

### Post 3 — Biggest Lesson
> A permission I'd built an entire feature for wasn't approved yet.
>
> I could have waited.
>
> Instead, I built a way to do the same thing without needing that permission — and shipped it in one day.
>
> Post a comment to any Instagram post. Hide it. Delete it. All from inside the Engagement Hub. No other platform to open. No other tab.
>
> The feature I'm most proud of this week wasn't in any product roadmap. It came from asking: "What can I give users right now, with what I already have permission to do?"
>
> Constraints don't always slow you down. Sometimes they point you at the better version of the feature.
>
> #ProductLessons #BuildInPublic #InstagramMarketing

### Post 4 — Funniest / Most Human Moment
> I spent more time on a single word this week than I want to admit.
>
> The comment hide button was doing nothing. The action completed. Instagram confirmed it. The comment stayed visible.
>
> After going deeper than anyone should ever go into an API reference, I found it: the parameter is `hide`. Not `hidden`. One word.
>
> The API accepted both spellings. Changed the result for only one of them. Quietly.
>
> The comment vanished the moment I fixed it.
>
> The lesson I keep relearning: precision in the details your client never sees is exactly what creates the experience they do see.
>
> #StartupLife #SoloFounder #AttentionToDetail

### Post 5 — Best Founder Advice (self-directed)
> The feature that took me the longest to plan was the one I didn't plan at all.
>
> Post Comment wasn't on the roadmap. It came from a constraint — a permission still pending review — and the decision not to wait for it.
>
> I sat down, thought about what outcome the user actually needed (the ability to moderate comments without leaving the dashboard), and built toward that instead of toward the permission.
>
> It shipped in one day. It's one of the most complete features in the hub now.
>
> The best founders I admire don't just execute plans. They know when to set the plan down and solve for the outcome directly.
>
> #FounderMindset #ProductDecisions #eWorkSocial

### Post 6 — One User / Community Observation
> A pattern I've noticed across every social media manager I've spoken to building their agency:
>
> The tool that saves them time isn't the one with the most features. It's the one that removes the most tab-switching.
>
> That's the principle behind the Engagement Hub. Not another dashboard. A single place where Instagram DMs arrive, auto-replies go out, comments get moderated, and conversations stay open until a human decides they're done.
>
> One inbox. Every conversation. No platform hopping.
>
> That's the week 2 milestone: the hub is live, and it's doing its job.
>
> #SocialMediaManager #AgencyLife #AfricanTech

### Post 7 — Milestone / What's Next
> The Engagement Hub received real Instagram conversations this week.
>
> Not test messages. Not simulations. Actual DMs from actual users, landing in a single place, with auto-replies going out and the full conversation history visible in one feed.
>
> It's a milestone I'll understate here because I know what still needs to happen before it becomes the thing it's trying to be.
>
> But the hub is awake. Conversations are flowing. Moderation works.
>
> What's next: the Meta App Review screencast is ready to record. One more permission and the inbound comment flow completes the loop — comments from external users will start arriving in the hub automatically, the same way DMs already do.
>
> Building in public, week by week. 🇳🇬
>
> #StartupMilestones #BuildInPublic #eWorkSocial

**Posting cadence:** 1 per day, Mon–Fri, then hold 2 in reserve for slower content weeks. Reply to every comment within 2 hours. End each post with either a question or an implicit one — avoid flat statements with no re-entry point for the reader.

---

## 2. YouTube — 10-Minute Founder Video Script

**Title:** "The Hub Woke Up — Instagram DMs, Comment Moderation, and a Feature I Built in One Day | Founder's Log #002"

**Format:** Talking-head to camera, intercut with screen recordings of the Engagement Hub and Veo3-generated b-roll (see Section 7 for prompts).

```
[00:00–00:30] COLD OPEN — talking head, direct to camera
"This week, conversations started arriving in eWork Social for the 
first time. Real Instagram DMs, landing in a single inbox, with 
auto-replies going out and the full history in one place. I also 
built a feature I hadn't planned, fixed a reply that was going out 
twice, and got within one screencast of closing the loop on Meta's 
App Review. This is Founder's Log number two — building eWork Social, 
in public, no highlight reel."

[00:30–02:30] SEGMENT 1 — The Conversations That Arrived
- Screen recording: Engagement Hub open, DMs visible in the feed
- Voiceover explains what the hub is and what it's supposed to do
  for social media managers managing multiple client accounts
- Talking head: "I'd expected a trickle. I got eight conversations 
  at once — because they'd all been waiting to arrive."
- Explain (briefly, without dwelling on the technical): something 
  between the webhook and the database was silently holding records 
  back. One fix, and everything queued up appeared immediately.
- Talking head: "Silent failures are expensive. The feature looks 
  like it's working. The user experience tells a different story."

[02:30–04:30] SEGMENT 2 — One Reply, Every Time
- Screen recording: auto-responder rules in eWork Social, a DM 
  triggering a keyword reply, one clean reply visible in the thread
- Voiceover explains what Instagram auto-reply does for agencies
  managing high-volume accounts (product inquiries, price requests)
- Talking head: "Instagram sends two signals per message. We were 
  replying to both. One fix: one signal handles the conversation, 
  the other sends the reply. Clean. Professional. On-brand."
- Talking head: "For a tool that speaks in your client's voice, 
  sending the same reply twice isn't a small issue. It's a trust issue."

[04:30–06:30] SEGMENT 3 — The Feature That Wasn't in the Roadmap
- Screen recording: Post Comment modal in the Hub — selecting a 
  post, writing a comment, posting, seeing it appear in the feed,
  then hiding it, then deleting it — complete moderation loop
- Voiceover: explain the Instagram comment permission situation 
  without making it sound like a problem — "the permission was 
  still under review, so I built the tool that didn't need to wait"
- Talking head: "Post a comment. Hide a comment. Delete a comment. 
  From inside the dashboard. No other tab. No other login."
- Talking head: "The constraint pointed me at the better version 
  of the feature."

[06:30–07:30] SEGMENT 4 — Conversations That Stay Open
- Talking head only, conversational pace
- "There was a behaviour in the hub where a conversation would 
  close itself after a reply was sent. Nobody asked it to do that."
- "A conversation belongs to the human managing it — not the app.
  Now it stays open until the human decides it's done."
- This is a short segment but a philosophically important one for 
  the brand — it reinforces: AI drafts, automation handles volume,
  humans remain in control.

[07:30–09:00] SEGMENT 5 — What's Next
- Screen recording: teaser of the Meta App Review dashboard or 
  the pending permissions list (blur sensitive data)
- Talking head: "The Engagement Hub is receiving real conversations 
  now. The next permission — instagram_manage_comments — will add 
  inbound comment notifications to the same feed. The screencast 
  is ready to record this week."
- Keep this forward-looking and confident, not technical

[09:00–10:00] CLOSE
- Talking head: the hub milestone, how eWork Social is shaping up 
  for social media agencies managing multiple accounts
- CTA: "If you want to see the Engagement Hub or try the 
  auto-responder yourself, the trial is still free, link's below.
  I read every message that comes through during onboarding."
- End card: app.eworksocial.com
```

**Production note:** Veo3 b-roll pairs with specific segments — see Section 7 for exact prompts. Lagos skyline and forward-motion shots work as mood bridges between segments, not as replacements for real footage. Authenticity is the point.

---

## 3. Weekly Newsletter

**Subject line:** Week 2 — Building eWork Social (the hub is awake, conversations are arriving)

```
Founder's Log — Week 2

This week:

✓ Instagram DMs are now landing in the Engagement Hub — real 
  conversations, in a single inbox, with full history visible.
  Full story: [link to blog post]

✓ Auto-responder fixed — one clean, on-brand reply per DM,
  every time. No more doubles.

✓ Post Comment shipped — create, hide, and delete Instagram 
  comments directly from the Engagement Hub. No other tab needed.

✓ Conversations now stay open until you decide they're done — 
  the hub no longer closes a thread just because a reply was sent.

✓ Meta App Review screencast ready to record — one permission 
  away from inbound comment notifications completing the loop.

Next week: record the screencast, submit, and keep building.

— Bernard

P.S. If you manage social media for clients and want to see the 
Engagement Hub or auto-responder yourself, the trial is free:
app.eworksocial.com
```

**Send cadence:** Every Friday or Monday, matching whichever day the blog post + LinkedIn Post 1 goes out, so all channels reinforce each other in the same window.

---

## 4. X / Twitter — 15 Tweets From One Blog

Thread format (post as one thread, or space individually over the week):

```
1/ Instagram DMs started arriving in eWork Social's Engagement Hub 
   this week. Here's what actually happened — and what I built along 
   the way 🧵

2/ The hub is designed to be one inbox for every Instagram DM and 
   comment your clients receive — no logging into separate apps.

3/ I'd set it up. Connected the webhooks. It looked like it was working.

4/ But only one conversation was showing. Out of eight I'd sent.

5/ The conversations were arriving. Then disappearing before they 
   could be seen. Silent. No error. No alert.

6/ One database configuration fix later — every conversation that had 
   been waiting showed up at once. Eight threads. All there.

7/ The auto-responder was also sending two replies to every DM.
   Instagram sends two signals per message. We were replying to both.

8/ One signal now handles the conversation.
   The other sends the reply.
   One trigger. One reply. On-brand, every time.

9/ Then I tried to test Instagram comment notifications.
   Watched the logs. Nothing came through.

10/ A permission I'd built the whole feature for was still pending 
    Meta review. No permission = no signal, no matter how well the 
    code is written.

11/ So instead of waiting, I built Post Comment.
    → Pick a post from your recent media
    → Write your comment
    → Post it from the Hub
    → Hide or delete it from the same screen.

12/ Comment moderation now lives inside eWork Social.
    No Meta Business Suite. No tab switching.

13/ Also fixed: conversations were auto-closing after a reply.
    Nobody asked for that. Now they stay open until you decide 
    they're done.

14/ The hub is awake. Real conversations. Clean replies.
    Complete comment moderation loop.

15/ Full log here: [blog link]
    Building eWork Social in public, every week, no highlight reel. 🇳🇬
```

---

## 5. Facebook — Long-Form Story Post

```
This week, the Engagement Hub in eWork Social started doing the one 
thing it was always supposed to do: receive conversations.

Instagram DMs — from real users, on real accounts — started arriving 
in a single inbox. One feed. Full conversation history. Auto-replies 
going out cleanly and professionally, without anyone having to log 
into Instagram separately to see what came in.

That's the goal the whole platform has been working toward: a social 
media manager who handles five clients across three platforms shouldn't 
need to check five different inboxes. They should see everything in one 
place and respond from there.

Getting here took some quiet behind-the-scenes work this week. 
Conversations were arriving but not appearing — a mismatch in how 
data was being stored meant they were landing somewhere the dashboard 
couldn't see. One correction, and eight conversations that had been 
waiting showed up immediately.

The auto-responder needed attention too. It was sending two replies 
to every DM — because Instagram sends two separate signals per 
message, and the system was reacting to both. Clean in the background. 
Confusing for anyone on the receiving end. Fixed: one signal opens 
the conversation, the other sends the reply.

I also built a feature I hadn't planned: Post Comment. A social media 
manager can now open any of their client's recent Instagram posts, 
write a comment, post it, hide it, or delete it — all from inside 
eWork Social, without opening another tool. The button is right there 
in the Engagement Hub.

It came out of a permission that's still pending Meta review — instead 
of waiting for it, I built what could be done without it.

The conversations are arriving. The moderation loop is in place. 
Next step: complete the Meta App Review and let inbound comment 
notifications join the same feed.

Building eWork Social in public, one honest week at a time.

Read the full log: [blog link]
```

---

## 6. Instagram — Carousel (8 Slides)

Dark-navy background (#0D1B2A), brand blue (#378ADD) accent text, Georgia/serif headline. One idea per slide.

```
Slide 1 (Cover):
"The conversations
started arriving.
This is how week 2
of eWork Social looked."
— Founder's Log #002

Slide 2:
The Engagement Hub
went live this week.
One inbox.
Every Instagram DM.
No separate logins.

Slide 3:
Eight conversations
had been waiting to arrive.
A single correction —
and they all showed up at once.

Slide 4:
The auto-responder
was replying twice
to every DM.
Instagram sends two signals
per message.
We were listening to both.
Fixed: one reply, every time.

Slide 5:
A permission was pending review.
So instead of waiting,
I built the feature
that didn't need it.

Slide 6:
Post Comment.
Write it. Post it.
Hide it. Delete it.
All from inside the Hub.
No other tab.

Slide 7:
Conversations now stay open
until the human decides
they're done.
Not the app.

Slide 8 (Close):
The Hub is awake.
Real conversations.
Clean replies.
Comment moderation live.
Read the full log → link in bio 🇳🇬
```

**Caption:**
"Founder's Log #002. The week Instagram DMs started arriving in the Engagement Hub — and what I built along the way. Full story at the link in bio. 🇳🇬

#BuildInPublic #eWorkSocial #SocialMediaManager #InstagramMarketing #AfricanStartup #FounderJourney #AgencyLife #SocialMediaManagement"

---

## 7. Veo3 Generative Video Prompts — B-Roll for YouTube / Reels / Shorts

Text-to-video prompts for Veo3, designed as atmospheric cutaways to intercut with real talking-head footage. Each written for an 8-second clip; generate 2–3 takes per prompt and pick the best.

```
PROMPT 1 — Opening mood shot (pairs with cold open)
"A softly lit workspace at dusk, a laptop screen open to a dashboard 
showing message threads glowing in dark blue and white, phone resting 
beside it with a notification arriving, gentle ambient light, slow 
cinematic push-in, shallow depth of field, contemplative and 
expectant mood, 4K photorealistic."

PROMPT 2 — The conversations arriving (pairs with Segment 1)
"Abstract visualization of glowing message envelopes flowing 
smoothly into a single inbox point of light, dark navy background, 
soft blue particle trails converging, satisfying arrival motion, 
clean minimal aesthetic, 4K."

PROMPT 3 — The fix / resolution moment (pairs with Segment 1 close)
"Extreme close-up of a phone screen, a conversation thread loading 
and populating with multiple messages appearing in quick succession, 
warm desk light reflected in the screen, slow-motion reveal, 
photorealistic, shallow focus."

PROMPT 4 — Lagos establishing shot (transition bumper)
"Aerial drone shot slowly descending over Lagos, Nigeria at golden 
hour, warm city lights beginning to turn on below, a modern office 
building in the foreground, cinematic color grade, wide establishing 
shot, photorealistic 4K."

PROMPT 5 — Auto-reply / precision (pairs with Segment 2)
"Close-up of hands typing a message on a phone, then a single 
reply notification appearing instantly on a laptop screen across 
the desk, clean minimal desk setup, warm practical lighting, 
satisfying timing to the sequence, photorealistic."

PROMPT 6 — Post Comment / moderation (pairs with Segment 3)
"A hand confidently tapping a single button on a tablet screen, 
the interface responding with a smooth confirmation animation, 
dark-mode UI in the background, crisp product photography lighting, 
minimal and professional, shallow depth of field."

PROMPT 7 — The constraint becoming the feature (pairs with Segment 3 close)
"A road blocked by a detour sign, a car smoothly turning onto 
an alternate route that leads to a clearer, wider road ahead, 
aerial shot, golden hour light, forward momentum, photorealistic."

PROMPT 8 — Closing / forward motion (pairs with close)
"A road stretching forward at dawn shot from a moving car's 
dashboard, warm sunrise light breaking over the horizon, steady 
forward motion, cinematic wide aspect ratio, hopeful and confident 
tone, photorealistic 4K."
```

**Usage guidance:**
- Prompts 1–3 pair with the "Conversations Arriving" segment (00:30–02:30)
- Prompt 4 works as the video's cold open or as a transition bumper between segments
- Prompt 5 pairs with the Auto-Reply segment (02:30–04:30)
- Prompts 6–7 pair with the Post Comment segment (04:30–06:30)
- Prompt 8 is the closing shot under your "what's next" CTA

---

## The Repeatable System — Going Forward

Every week, once a new Founder's Log post is written:

1. Write the blog post (Founder's Log format — story-driven, 5–7 scenes)
2. Extract 7 LinkedIn posts using the categories above (surprise / objection / lesson / human moment / advice / community observation / milestone)
3. Adapt the YouTube script template with that week's actual scenes
4. Write the newsletter using the ✓ checklist format
5. Compress into 15 tweets using the thread structure
6. Write one Facebook long-form version
7. Design one 8-slide Instagram carousel
8. Generate 6–8 Veo3 b-roll clips matching that week's scenes

---

## Hashtag Strategy Reference

### Tier breakdown:

**Niche / high-intent (under 50K):**
`#eWorkSocial` `#AfricanStartup` `#NigeriaStartup` `#TechAfrica` `#FounderJourney` `#SocialMediaSaaS` `#AfricanFounder` `#AttentionToDetail`

**Mid-tier / engaged (50K–500K):**
`#BuildInPublic` `#AgencyLife` `#SocialMediaManager` `#SocialMediaAgency` `#InstagramDM` `#ProductLessons` `#FounderMindset` `#SaaS` `#ProductDecisions`

**Broad / reach (500K+):**
`#SocialMediaManagement` `#InstagramMarketing` `#DigitalMarketing` `#StartupLife` `#StartupMilestones` `#AgencyTools`

### Platform caps:
- **LinkedIn:** 3–4 hashtags per post (one niche, one mid, one broad — keep them relevant to that post's angle)
- **Instagram carousel:** 8 hashtags in caption (mix all tiers); additional 12 in first comment
- **Twitter/X:** 0 hashtags mid-thread, 2–3 on closing tweet only
- **Facebook:** 0–3 hashtags, optional
- **Threads:** 3–5 hashtags, casual tone
