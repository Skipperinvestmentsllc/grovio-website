# Homeschool Records Checkup Pilot Plan

Last updated: 2026-07-29

## Working Concept

Build a five-state pilot for a calm, source-linked homeschool records tool.

Working page:

```text
/guide/homeschool-records-by-state
```

Working tool name:

```text
Homeschool Records Checkup
```

Claire-style promise:

> Let's make the recordkeeping part feel less mysterious.

This should feel like a warm Guide tool, not a legal database. It should help overwhelmed homeschool moms figure out what to verify, what to keep, and how to build a simple record habit without panic.

## Pilot States

Start with five states only:

- South Carolina
- Florida
- New York
- Pennsylvania
- Texas

Why these states:

- South Carolina tests multi-option/pathway nuance.
- Florida tests portfolio and annual evaluation language.
- New York tests IHIP, quarterly reports, attendance, hours, and annual assessment complexity.
- Pennsylvania tests affidavit/declaration, portfolio, evaluator, testing, and annual evaluation nuance.
- Texas gives a light-recordkeeping contrast while still encouraging wise parent-held records.

Do not launch all states until the pilot is accurate, useful, and easy to read.

## Non-Negotiables

- grovio is always lowercase.
- Every public state result includes `Reviewed on: Month Day, Year`.
- Every state includes official source links.
- Every state includes at least one reputable secondary source link where useful.
- No page says "this makes you compliant."
- No page gives legal advice.
- Requirements must be phrased with nuance:
  - "verify"
  - "may"
  - "commonly"
  - "under this pathway"
  - "your association/district/source gets the final word"
- If a state has multiple homeschool pathways, each pathway gets its own recordkeeping summary.
- If a requirement differs by grade, pathway, district, or association, the result must say so.
- Do not flatten complicated states for SEO.

## Page Experience

### Top Tool

The top of the page should feel quiz-like:

1. Choose your state.
2. If needed, choose your pathway.
3. Choose what feels blurry:
   - Attendance
   - Portfolio
   - Evaluations
   - Reports
   - Just tell me what matters
4. Show a calm result.

The result should include:

- Tier/pathway badge.
- Quick answer.
- What to verify first.
- What records to consider keeping.
- Official links.
- Claire note.
- How grovio can help.

### Crawlable Reference

Below the quiz, the same information should exist as normal HTML:

- State cards.
- Pathway sections.
- Recordkeeping checklists.
- Official source links.
- FAQ.
- Disclaimer.

This keeps the tool useful for people and readable for Google, Bing, and AI search systems.

## Tier Language

Avoid "easy" and "hard." Use recordkeeping-oriented language:

- Light recordkeeping
- Basic records
- Structured records
- Portfolio / assessment review
- Higher oversight
- Multi-pathway state

States can have more than one tier internally if pathways differ.

## Data Model

Each state can contain multiple pathways. A state-level row is not enough.

Recommended fields:

- `state`
- `state_slug`
- `reviewed_on`
- `summary_tier`
- `has_multiple_pathways`
- `official_source_urls`
- `secondary_source_urls`
- `state_level_caveat`
- `pathways`

Each pathway:

- `pathway_name`
- `pathway_slug`
- `common_name`
- `is_commonly_used`
- `common_use_note`
- `tier`
- `quick_answer`
- `what_to_verify`
- `notice_or_enrollment`
- `attendance_or_days`
- `hours`
- `subjects`
- `portfolio`
- `assessment_or_evaluation`
- `reports`
- `parent_qualification`
- `records_to_consider_keeping`
- `what_is_submitted`
- `what_is_kept_at_home`
- `source_urls`
- `nuance_notes`
- `claire_note`
- `grovio_help`
- `confidence_status`

For new homeschool families, `notice_or_enrollment` should include the practical starting questions when they are relevant: notice of intent, district filing, association/enrollment route, and whether a currently enrolled child needs formal withdrawal from school. Public copy should phrase this as "verify this step" unless an official source clearly states the exact process.

Confidence status options:

- `ready_for_copy`
- `needs_secondary_review`
- `needs_official_confirmation`
- `too_ambiguous_to_publish`

## Source Standard

Use sources in this order:

1. Official state Department of Education or state agency pages.
2. Current state statutes or regulations.
3. Current official district guidance only when state-level guidance delegates administration to districts.
4. HSLDA and/or CRHE as secondary summary/context sources.
5. State homeschool association sources when they explain a pathway or practical implementation.

For complicated states, at least two independent source types should be checked before copy is written.

## Pilot Source Notes

### South Carolina

Key nuance:

South Carolina has three homeschool options. The tool must ask which option the family is using or planning to use. It should not give one flattened answer.

Important source findings:

- The South Carolina Department of Education states that South Carolina law provides three options: Option One under a school district, Option Two with the South Carolina Association of Independent Home Schools, and Option Three through a home school association with at least fifty members.
- South Carolina Code Section 59-65-47 describes Option Three association requirements, including 180 instructional days, basic subjects, parent-held educational records, portfolio samples, and semiannual progress reports including attendance and individualized progress documentation.

Claire-style note direction:

> South Carolina is one of those states where the answer depends on which path you are actually using. Don't try to memorize all three at once. Start by figuring out your option, then your recordkeeping list gets much clearer.

### Florida

Key nuance:

Florida has statutory home education requirements, including notice and annual evaluation. Portfolio language needs to be clear because many families use a portfolio evaluation as one annual evaluation route, but the tool should not imply it is the only route.

Important source findings:

- The Florida Department of Education parent resources page lists three statutory parent requirements: file a Letter of Intent, turn in annual evaluations, and file a Letter of Termination when the home education program ends.
- Florida portfolio/evaluation summaries should link back to official state materials and be careful about evaluation options.

Claire-style note direction:

> Florida can sound scarier than it usually feels once you understand the rhythm: tell the district you are homeschooling, keep your materials as the year goes, and handle the annual evaluation instead of scrambling at the end.

### New York

Key nuance:

New York is higher oversight. Requirements vary by grade level and include IHIP, quarterly reports, attendance records, hours, required subjects, and annual assessment. The tool must not oversimplify this state.

Important source findings:

- NYSED Q&A says parents are required to keep attendance records for each student and recommends keeping evidence of the program, achievement, and correspondence with the district.
- New York regulation 8 NYCRR 100.10 includes 180 days, 900 annual hours for grades 1-6, 990 annual hours for grades 7-12, attendance records maintained by the parent and available upon request, and quarterly reports.
- NYC guidance describes required documents including Letter of Intent, IHIP, quarterly progress reports, and annual assessment.

Claire-style note direction:

> New York is a write-it-down state. That does not mean you need to panic, but it does mean you want a steady record habit from the beginning of the year.

### Pennsylvania

Key nuance:

Pennsylvania has home education program requirements, affidavit or unsworn declaration, annual evaluation report, portfolio, and standardized testing in certain grades. Evaluator details matter.

Important source findings:

- Pennsylvania Department of Education says supervisors submit a notarized affidavit or unsworn declaration before starting and annually by August 1.
- PDE says a home school evaluation report must be submitted by June 30.
- PDE states that grades 3, 5, and 8 must include required standardized testing results in the portfolio.

Claire-style note direction:

> Pennsylvania is a portfolio-and-evaluator state. The calmest version is not a giant binder at the end. It is a small habit all year: keep the log, save samples, and know what your evaluator wants before June.

### Texas

Key nuance:

Texas is lighter from a state-regulation standpoint, but the result should not suggest "keep nothing." Families may still need records for transfers, high school, transcripts, family clarity, and future documentation.

Important source findings:

- The Texas Education Agency states that TEA does not regulate, index, monitor, approve, register, or accredit home school programs.
- TEA says Texas home schools must be conducted in a bona fide manner using a written curriculum including reading, spelling, grammar, math, and good citizenship.
- A district may request a letter of assurance if it becomes aware a student may be homeschooled.

Claire-style note direction:

> Texas may not ask you for much, but future-you still deserves a record. Keep enough to remember what happened, show progress if your child transfers, and see the homeschool you are building.

## Suggested Public Copy Elements

Page H1:

> Let's make homeschool records feel less confusing.

Subhead:

> Choose your state, tell me what feels blurry, and I will help you see what to verify, what to keep, and where to double-check the official source.

Disclaimer:

> This is general homeschool recordkeeping guidance, not legal advice. Requirements can change, and your official state source, district, evaluator, or association gets the final word.

Quiz labels:

- Where are you homeschooling?
- Which path are you using?
- What part feels blurry?
- Do you want the short answer or the full reference?

Result labels:

- Start here
- What to verify
- What to keep
- What may need to be submitted
- What can usually stay in your own records
- Claire's note
- How grovio can help

## Build Phases

### Phase 1: Data And Source Review

- Create the five-state pilot dataset.
- Verify each state against official sources.
- Add source links and reviewed dates.
- Mark anything ambiguous.

### Phase 2: Copy Draft

- Write Claire-style copy for each state/pathway.
- Keep source-linked notes in the dataset separate from public-facing copy.
- Review for legal caution.

### Phase 3: UX Mockup

- Design the interactive quiz/reference page.
- Confirm mobile readability.
- Confirm state cards are crawlable in HTML.

### Phase 4: Build Pilot Page

- Add `/guide/homeschool-records-by-state`.
- Add sitemap entry only after content is reviewed.
- Add FAQ/schema only for visible FAQ content.
- Add internal links from relevant Guide articles.

### Phase 5: Review Before Publish

- Manual source review.
- Copy review for Claire voice.
- Legal disclaimer review.
- Link audit.
- JSON-LD validation.
- Mobile/desktop visual check.

## What We Are Not Doing Yet

- Not launching all 50 states plus DC.
- Not publishing unsourced state claims.
- Not creating thin state SEO pages.
- Not claiming legal compliance.
- Not hiding all content inside JavaScript.
