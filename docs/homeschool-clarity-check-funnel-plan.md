# Homeschool Clarity Check — UGC Funnel Plan

Last updated: 2026-09-03

## Decision

Build a first-party, mobile-first interactive lead page called the **Homeschool Clarity Check** at:

```text
/check-in
```

It is the bridge between a relatable UGC ad and grovio. It must not feel like a test, a diagnosis, or a way to judge whether someone is homeschooling correctly.

The promise:

> Your homeschool may not need more pressure. It may just need the right kind of support.

The check-in identifies the one grovio-supported need that would make a family's current season feel lighter. It shows its result immediately, with no email wall. The result then gives a specific next step, a relevant Guide article, and a tailored app-download action.

This is separate from the planned **Homeschool Records Checkup** at `/guide/homeschool-records-by-state`.

- The Clarity Check is broad, emotional, short, and paid-social-friendly.
- The Records Checkup is a later, source-backed legal/recordkeeping resource.
- A person whose Clarity Check result is about records may be offered the Records Checkup as a secondary next step once it is launched. The Clarity Check itself must not give state-specific or legal guidance.

## Success Hypothesis

Cold viewers are more likely to act on a personal, low-pressure reflection than on an immediate app-download request. The check-in creates a meaningful intermediate conversion and lets grovio match the follow-up message to the reason someone clicked.

The funnel:

```text
UGC video ad
  → /check-in with source, campaign, video, and creative parameters
  → six-question check-in
  → result page matched to the person's primary need
  → /get with the result and campaign parameters preserved
  → App Store or Google Play
  → app install / activation when measurement is available
```

## The Four Result Paths

Use need-based titles, never personality labels. Someone can be any mixture of these; the check-in only names the most helpful next focus.

| Result key | User-facing result | Core reframe | grovio's relevant promise | Primary next step |
| --- | --- | --- | --- | --- |
| `visibility` | **You need to see the learning that's already happening.** | The problem is not necessarily that too little is happening; it is that the evidence is scattered or invisible. | Capture photos and notes, build a portfolio, see the week in the Wrap-Up. | Capture one real learning moment today. |
| `rhythm` | **You need a plan that can live in real life.** | A day going off-plan is not proof that the family needs a stricter schedule. | Choose a rhythm or schedule; keep a flexible daily view. | Pick three anchors for the next school day. |
| `records` | **You need calmer records, not a last-minute scramble.** | Recordkeeping becomes manageable when it is a small habit rather than an end-of-year project. | Mark attendance, save portfolio evidence, see year pace, export records. | Mark today's attendance and save one piece of evidence. |
| `simplicity` | **You need a lighter system.** | The system should support the family, not become another job the parent must maintain. | One quiet place for today's plan, attendance, moments, and guidance. | Use one place for today's essentials for one week. |

### Shared result-page structure

Every result page contains:

1. Result headline and a short, warm explanation (50–80 words).
2. A `Start here this week` card with one tiny action and no product requirement.
3. A `How grovio can help` card that names only the 2–3 relevant features.
4. A single primary CTA: `Try the calm way to [result benefit] — free`.
5. A secondary, unhurried path: the most relevant Guide article.
6. A small optional email field: `Send me this result and a three-day reset.`
7. A privacy note and links to Privacy and Terms.

Do not claim that grovio makes someone compliant, resolves anxiety, or is the only right fit. Do not use a fake numerical score.

## Check-in Experience and Scoring

### Opening screen

**Eyebrow:** A gentle homeschool check-in

**Headline:** What would make your homeschool feel lighter right now?

**Body:** Six quick questions. No wrong answers, no report card—just a clearer next step for the season you're in.

**Button:** Start the 2-minute check-in

Include `About 2 minutes · Free · No email required` immediately below the button.

### Questions

Display one question at a time, with large tap targets, a visible `Question 2 of 6` progress label, and Back/Next controls. Answers are required. The final click is `Show my next step`.

| # | Question | Four answer directions |
| --- | --- | --- |
| 1 | At the end of a normal homeschool week, what feels hardest? | Showing what actually happened (`visibility`); keeping a plan when life shifts (`rhythm`); knowing my records are in order (`records`); keeping up with all the systems (`simplicity`) |
| 2 | When something unexpectedly changes the day, what tends to happen? | The learning happens but I forget to save it (`visibility`); the plan falls apart (`rhythm`); I worry whether it still counts (`records`); I spend too much time rearranging tools (`simplicity`) |
| 3 | If someone asked what your child learned this month, how would that feel? | I know it happened, but it is hard to show (`visibility`); I would have to piece together our days (`rhythm`); I am not sure I have the records (`records`); I would look in too many places (`simplicity`) |
| 4 | Which thought sounds most familiar right now? | `I wish I could see the good we're doing.` (`visibility`); `I need a flow that bends with our life.` (`rhythm`); `I don't want to scramble when someone asks.` (`records`); `I cannot maintain one more complicated system.` (`simplicity`) |
| 5 | What would feel like the biggest relief by Friday? | A small collection of moments I can look back on (`visibility`); a day that has a gentle shape (`rhythm`); knowing I kept up with the basics (`records`); having fewer things to manage (`simplicity`) |
| 6 | What do you most want help with first? | Seeing the learning; planning a real-life rhythm; keeping simple records; making this all feel less heavy. |

### Scoring rules

- Each answer adds one point to its corresponding result key.
- Question 6 is the tie-breaker and adds two points.
- If a tie remains, use the answer to Question 4; if still tied, use `simplicity` only when it was chosen, otherwise use the first tied key in this order: `visibility`, `rhythm`, `records`, `simplicity`.
- Save only the final result key, anonymous session ID, source parameters, and completion timestamp by default. Do not retain individual answers unless there is a clear research need and the Privacy Policy reflects it.
- Keep the full score object in browser session storage solely to render the result and preserve it during the visit.

## Result Copy Map

### Visibility

**Lead:** You are probably doing more than you can easily see right now. Learning that lives in conversations, outings, projects, and ordinary days is still real—even when it never made it into a formal plan.

**grovio message:** Save the moments that matter with a photo, note, subject, and date. Over time, your portfolio becomes a calmer answer to, `What did we do this week?`

**Guide path:** `/guide/what-counts-as-learning`

**CTA:** `Start keeping the learning visible`

### Rhythm

**Lead:** You do not need to make real life fit a perfect schedule. A rhythm gives your day a few trustworthy anchors while leaving room for energy, appointments, interruptions, and rabbit trails.

**grovio message:** Plan by rhythm or by schedule, then keep today's next step close without rebuilding the whole week when plans shift.

**Guide path:** `/guide/how-do-i-create-a-daily-rhythm`

**CTA:** `Find a calmer rhythm`

### Records

**Lead:** Recordkeeping feels biggest when it waits until someone needs it. A quick attendance habit and a few saved learning moments can turn a future scramble into something you can actually see forming.

**grovio message:** Mark attendance, save evidence as learning happens, track year pace, and export what you need when it is time.

**Guide path:** `/guide/what-records-should-i-keep`

**CTA:** `Keep records without the scramble`

### Simplicity

**Lead:** You should not need an operations degree to homeschool your children. A useful system makes the essentials easier to find and leaves the rest of your attention for your family.

**grovio message:** grovio puts today's plan, attendance, meaningful moments, and gentle guidance in one quiet place—without streaks or guilt-trip notifications.

**Guide path:** `/guide/how-do-i-stay-consistent-without-burnout`

**CTA:** `Make the essentials feel lighter`

## UGC Package: The Only Creative Input Needed

The user provides four vertical UGC videos. The implementation team will trim them into placements, create captions/on-screen copy, add end cards, prepare thumbnails, upload the ads, and connect each one to the correct tracked URL.

### Delivery specification

- Original 9:16 vertical video, 1080 × 1920 or higher.
- 20–35 seconds of usable spoken content; no music that cannot be licensed for ads.
- One clean take plus any alternate hooks or b-roll is useful but not necessary.
- Leave 1–2 seconds of visual room at the beginning and end for captions/end card.
- Do not show children's faces, school names, addresses, other families, or copyrighted curriculum pages unless permission is certain.
- Natural phone footage is preferable to highly polished ad delivery.

### Video briefs

| Video | Human truth / hook | Story beat | On-screen CTA | Result emphasis |
| --- | --- | --- | --- | --- |
| 1 — Invisible learning | `I kept wondering if we were doing enough.` | The realization that the issue was not necessarily doing more—it was having no way to see the learning already happening. | `What does your homeschool need most right now? Take the 2-minute check-in.` | Visibility |
| 2 — Real-life rhythm | `Every beautiful schedule seemed to fall apart by Tuesday.` | The shift from making a perfect plan to finding a few flexible anchors. | `Find the kind of support your homeschool needs.` | Rhythm |
| 3 — Calmer records | `I knew we were homeschooling. I just couldn't prove it without digging through everything.` | The relief of simple records gathered a little at a time. | `Get your next calm step in 2 minutes.` | Records |
| 4 — Too many systems | `I did not need another thing to maintain.` | The difference between a system that creates work and one that reduces mental load. | `Take the Homeschool Clarity Check.` | Simplicity |

Each video uses the same destination; its message determines the visible headline, first screenshot/thumbnail, and campaign parameters. Do not build four nearly identical scorecards.

## Technical Implementation

The current marketing site is static HTML on Vercel, with clean URL rewrites. Build the check-in natively rather than buying a quiz platform. That keeps the experience on grovioapp.com, preserves visual quality, avoids third-party branding, and lets it pass campaign/result context into `/get`.

### Pages and files

- Add `check-in.html` with all question and result content in semantic HTML.
- Add a small page-specific JavaScript module for the question state, scoring, UTM persistence, result rendering, and event calls.
- Add `/check-in` → `/check-in.html` to `vercel.json` rewrites.
- Add the page to `robots.txt` as indexable only after the copy is final. It is fine to launch paid traffic first with `noindex,follow`; do not add a thin, duplicate quiz page to the sitemap while it is being tested.
- Use the existing grovio typography, colors, mobile navigation, footer, and app-store route pattern. The page must be useful at 320 px wide, keyboard navigable, and work without any email collection.
- Make result states addressable as `?result=visibility` only after a user completes the scorecard or lands from a saved-email link. Never use preselected public result URLs as an ad destination.

### Data, email, and privacy

- Use browser storage for the anonymous result and campaign context.
- The optional `Send me this result` form adds a subscriber to Kit with the tags `clarity-check`, `clarity-[result]`, and `source-[source]`. Store only the email, result key, campaign metadata, explicit marketing consent, and submission date.
- The email sequence is three messages: result reminder and tiny action immediately; relevant Guide/article support on Day 2; gentle grovio invitation on Day 5. It is not a daily sales sequence.
- Update the Privacy Policy before launch. The current policy says there are no advertising partners or behavioral tracking, while some marketing pages already load Meta and Pinterest tags. The policy must accurately describe web analytics, advertising measurement/remarketing, data categories, relevant partners, retention, opt-out/cookie controls, and the optional email subscription. Have counsel review the final wording if required for the audiences being targeted.
- Never send a child's name, age, answers, portfolio material, or sensitive free-text information to analytics or advertising platforms.

### Measurement

The site already has GA4, Meta Pixel, and Pinterest tag snippets on at least some pages; move to a consistent shared implementation before driving paid traffic. Events must fire only once per meaningful action.

| Event | Fires when | Parameters allowed | Used for |
| --- | --- | --- | --- |
| `checkin_view` | `/check-in` loads | source, campaign, content | landing-page quality |
| `checkin_start` | first answer selected | source, campaign, content | start rate |
| `checkin_complete` | final result is calculated | result key, source, campaign, content | primary web conversion |
| `checkin_result_view` | result is rendered | result key, source, campaign, content | result-page quality |
| `checkin_email_submit` | optional email form succeeds | result key, source, campaign, content | qualified lead |
| `checkin_app_click` | user selects the app CTA | result key, platform, source, campaign, content | store intent |
| `checkin_guide_click` | user opens the relevant Guide article | result key, guide slug | content-assist behavior |

Use a standard event such as `Lead` only for the optional email subscription, and retain `checkin_complete` as a custom event. Do not label an anonymous answer as a lead merely to make an ads dashboard look better.

Preserve `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `video`, `creator`, and `result` through the result CTA into `/get`. Update `/get` so its immediate device redirect preserves approved parameters when it forwards to the Apple App Store or Google Play. Configure distinct store/campaign attribution links or a mobile measurement partner if install and activation attribution is required; web click data alone cannot prove an App Store install.

### Conversion integrity

- QA every ad URL on iOS, Android, and desktop.
- Confirm that `/get` does not discard the result/campaign parameters before the store redirect.
- Match `checkin_app_click` to actual store-link clicks; do not infer an install.
- If enough volume exists, use the completed check-in or optional email lead as the optimization event. Until then, optimize prospecting for landing-page views and judge creative by completion rate and qualified app-click rate.
- Add server-side measurement only after the client-side events, consent setup, and exact data flow are verified. It is not a substitute for consent or for a clean event taxonomy.

## Paid Funnel Configuration

### Campaign 1: cold UGC → Clarity Check

- One ad set per initial audience/creative test, with the four UGC videos rotated fairly.
- Send every video to `/check-in`; vary `utm_content` and `video` so the winning message can be identified.
- Begin with landing-page-view optimization if completed check-ins do not have enough weekly volume. Move optimization to the completed check-in only when there is sufficient stable data.
- Do not mix a direct app-install CTA into this initial test. That creates two different promises and makes the scorecard test impossible to interpret.

### Campaign 2: warm retargeting → result or app

Create audiences once events are live:

- Started the check-in but did not complete it within 7 days: show a short reassurance/finish-the-check-in ad.
- Completed the check-in but did not tap the app CTA within 14 days: show the result-specific grovio benefit.
- Tapped the app CTA but did not activate, if reliable app attribution becomes available: show an app-specific reminder, excluding installers/active users.
- Existing app users/subscribers: exclude from all acquisition audiences.

### Campaign 3: direct app acquisition

Keep a small direct-to-store campaign as the control. It gives a real answer to whether the Clarity Check produces better-quality clickers, rather than merely more cheap clicks.

## Reporting and Decision Rules

Review by video and by result path, not only in aggregate.

| Funnel point | Diagnostic measure | What it tells us |
| --- | --- | --- |
| UGC → page | outbound CTR and landing-page view rate | whether the hook earns curiosity |
| page → start | start rate | whether the page promise matches the ad |
| start → result | completion rate | whether the questions are short, clear, and worth finishing |
| result → app | app-click rate by result | whether the recommendation feels relevant |
| app click → activation | attributed install/activation rate | whether the funnel is producing actual users |
| email option | email opt-in rate and Day 5 app-click rate | whether the nurture path helps rather than adds friction |

Initial learning questions:

1. Which UGC truth produces the strongest completed-check-in rate?
2. Which result path creates the strongest app-click and eventual activation rate?
3. Do people who complete the check-in activate at a higher rate than a direct-to-store control audience?
4. Does the optional email path create additional qualified activation without reducing direct app clicks?

Do not declare success from click-through rate alone. A winning version should improve both completed check-ins and downstream app intent or activation.

## Build and Launch Sequence

### Phase 0 — Foundations

1. Finalize result copy and the six questions from this document.
2. Audit and standardize GA4, Meta, and Pinterest measurement across `check-in` and `/get`.
3. Update privacy/cookie language and the optional-email consent language before traffic is purchased.
4. Confirm Kit tags/form submission route and app-store attribution requirements.

### Phase 1 — Build

1. Implement the mobile-first `/check-in` experience, scoring, result rendering, and all four tailored paths.
2. Implement UTM persistence and event instrumentation.
3. Add email capture and the three-message Kit sequence.
4. Update `/get` to preserve campaign context and provide correctly tracked platform-specific store links.
5. QA accessibility, analytics, content, and cross-device redirect behavior.

### Phase 2 — Creative preparation

1. Receive the four UGC source clips.
2. Add captions, short hook text, approved end cards, thumbnail variants, and unique destination parameters.
3. Produce placement-safe versions and upload them to the relevant ad accounts.

### Phase 3 — Controlled launch

1. Launch all four UGC ads to the same check-in, with a direct-to-store control kept separate.
2. Verify first-day events against real test traffic before evaluating performance.
3. Build the retargeting audiences after sufficient traffic arrives.
4. Let a stable test run long enough to compare downstream behavior; do not replace every creative after a handful of clicks.

### Phase 4 — Iterate

1. Keep the best message/result alignment.
2. Rewrite or replace the weakest UGC hook, not the entire funnel.
3. Test one variable at a time: page headline, first question, result CTA, or end card.
4. After the records tool launches, add it as an appropriate secondary next step only on the `records` result.

## Ownership and Dependencies

### What the user supplies

1. Four UGC videos following the delivery specification.
2. Access/authorization for any paid advertising account, Kit account, analytics property, and app-store attribution setup that needs to be configured externally.
3. A final approval on paid copy, privacy wording, and launch budget.

### What implementation covers

- All scorecard and result-page copy.
- Native site build, design, responsive behavior, and accessibility.
- Event taxonomy, UTM propagation, QA plan, and reporting view.
- Caption/end-card/thumbnail treatment of the supplied UGC.
- Email tags and three-message nurture copy.
- Campaign structure, URL mapping, audience logic, and launch checklist.

## Launch Definition of Done

The funnel is ready for spend only when:

- All six questions and four outcomes render correctly on mobile and desktop.
- Every UGC ad has a unique tracked URL and an approved end card.
- The result is useful with no email submitted.
- App and Guide CTAs preserve campaign/result context and go to the correct place for iOS, Android, and desktop.
- Analytics events are deduplicated and visible in test traffic.
- The Privacy Policy accurately reflects actual tracking and email collection.
- Existing subscribers and app users are excluded from acquisition campaigns.
- A direct-to-store control and result-specific retargeting audiences are prepared.
