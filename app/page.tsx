'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/* ─── TYPES ─────────────────────────────────── */
type Screen      = 'input' | 'chat' | 'thinking' | 'output';
type BubRole     = 'ai' | 'user';
type InputMode   = 'build' | 'improve';
type TargetModel = 'claude' | 'gpt4' | 'gemini';
type ActiveVariant = 'orig' | 'a' | 'b';

interface Bub   { id: number; role: BubRole; text: string; }
interface Saved { id: string; raw: string; prompt: string; type: string; ts: number; }
interface Conv  { q: string; a: string; }
interface Profile { role: string; industry: string; tools: string; goals: string; }

const THINKING_LINES = [
  'Reading your intent...',
  'Choosing the right expert role...',
  'Engineering the constraints...',
  'Calibrating precision...',
  'Locking in output format...',
  'First draft complete...',
];

const CRITIQUE_LINES = [
  'Auditing specificity...',
  'Testing quality criteria...',
  'Patching weak sections...',
  'Anchoring key constraints...',
  'Final refinement pass...',
  'Locking in the upgrade...',
];

const REFINE_CHIPS = ['Make it shorter','More direct','More formal','More aggressive','Add examples','Simpler language'];

const TYPE_LABELS: Record<string, string> = {
  negotiation: 'Negotiation',
  communication: 'Communication',
  marketing: 'Marketing',
  analysis: 'Analysis',
  strategy: 'Strategy',
  coding: 'Engineering',
  writing: 'Writing',
  creative: 'Creative',
  education: 'Education',
  research: 'Research',
  email: 'Email',
};

const TECHNIQUES: Record<string, {code:string;desc:string}[]> = {
  negotiation:[
    {code:'VALUE-FIRST ANCHORING',desc:'Opening with a specific measurable result shifts the frame from "wanting more" to "being paid accurately for what you produce."'},
    {code:'ASK SEPARATION',desc:'The email\'s only job is getting the meeting — not winning the raise. Collapsing both is the most common reason salary requests fail.'},
    {code:'CONSTRAINT ARCHITECTURE',desc:'Banning "deserve," "just wanted to," and apology language removes the 6 phrases that signal low confidence.'},
  ],
  communication:[
    {code:'SBI FRAMEWORK',desc:'Situation → Behaviour → Impact forces separation of what happened from how it felt — the most important discipline in any high-stakes conversation.'},
    {code:'HEADLINE FIRST',desc:'State the core message before context. Burying hard news is the most common communication mistake at every level.'},
    {code:'RELATIONSHIP PRESERVATION',desc:'The quality standard requires the conversation to end with the relationship intact. Without this, AI defaults to technically correct but relationally damaging language.'},
  ],
  marketing:[
    {code:'ROLE INJECTION',desc:'Assigning an expert identity first activates specialized knowledge — not generic writing defaults.'},
    {code:'PAS FRAMEWORK',desc:'Problem → Agitate → Solution — the backbone of the highest-converting cold outreach ever written.'},
    {code:'CONSTRAINT MAPPING',desc:'Explicit prohibitions short-circuit the tendency toward generic, hedged language.'},
  ],
  coding:[
    {code:'ROLE INJECTION',desc:'A principal-engineer identity optimises for production readiness and edge cases — not just "working code."'},
    {code:'PRE-WORK REASONING',desc:'Identifying failure modes before writing forces a planning pass that dramatically reduces bugs.'},
    {code:'OUTPUT SPECIFICATION',desc:'Defining the exact deliverable eliminates the default of producing the minimum viable response.'},
  ],
  analysis:[
    {code:'PYRAMID PRINCIPLE',desc:'Lead with conclusion, support with evidence. Without this, AI buries the lead by default.'},
    {code:'MECE STRUCTURE',desc:'Mutually Exclusive, Collectively Exhaustive framing stops redundant or gappy analysis.'},
    {code:'PRE-WORK REASONING',desc:'The cognition block forces hypothesis formation and testing — rather than narrating as it goes.'},
  ],
  strategy:[
    {code:'CONSTRAINT-FIRST',desc:'Identifying the binding constraint before tactics mirrors how great operators think — fix the bottleneck, not the symptoms.'},
    {code:'SPECIFICITY FORCING',desc:'Requiring owners, timelines, and success metrics stops vague strategic direction.'},
    {code:'PRE-WORK REASONING',desc:'The cognition block forces system mapping before prescribing actions — diagnosis before treatment.'},
  ],
  creative:[
    {code:'FIRST IDEA VETO',desc:'Prohibiting the obvious forces past the highest-probability outputs and into genuinely original territory.'},
    {code:'CONCEPT-FIRST',desc:'Territory before execution stops generating tactics without strategic grounding.'},
    {code:'BRIEF ANCHORING',desc:'Brief-first framing means every idea is evaluated against the actual problem, not just aesthetic appeal.'},
  ],
  education:[
    {code:'FEYNMAN TECHNIQUE',desc:'Explain to a smart 12-year-old, add complexity only as needed. This calibrates abstraction to genuine clarity.'},
    {code:'KEYSTONE FIRST',desc:'Leading with the single most important concept before complexity is how understanding is built, not just conveyed.'},
    {code:'CONFUSION MAPPING',desc:'Pre-empting the 3 most common misconceptions shows understanding of the learner\'s mental model, not just the subject.'},
  ],
  writing:[
    {code:'READER-FIRST STRUCTURE',desc:'Every structural decision is optimised for the reader, not the writer — the hardest discipline in writing.'},
    {code:'ECONOMY OF LANGUAGE',desc:'The instruction to cut 20% forces precision. Padding is the default when unconstrained.'},
    {code:'RESONANT CLOSE',desc:'Separating "resonant close" from "summary" means ending with meaning, not repetition.'},
  ],
  research:[
    {code:'DECISION ANCHORING',desc:'Framing research around a specific decision keeps analysis actionable rather than academic.'},
    {code:'SOURCE TRIANGULATION',desc:'Requiring multiple source types prevents single-source bias in competitive analysis.'},
    {code:'SYNTHESIS OVER SUMMARY',desc:'The distinction between analysis and summary is the difference between insight and information.'},
  ],
  email:[
    {code:'SINGLE CTA',desc:'One ask per email. Multiple asks reduce response rates by 40–60%.'},
    {code:'SUBJECT LINE SCIENCE',desc:'The subject line is read in 0.3 seconds. It must earn the open without tricks or vague promises.'},
    {code:'CONTEXT COMPRESSION',desc:'The reader needs just enough context to say yes — not your full reasoning.'},
  ],
};

/* ─── DETECT TYPE ───────────────────────────── */
function detectType(t: string): string {
  const l = t.toLowerCase();
  if (/\b(raise|salary|promotion|pay increase|compensation|negotiate)\b/.test(l)) return 'negotiation';
  if (/\b(difficult conversation|hard talk|confrontation|conflict|feedback to|performance issue|delay|bad news|explain to|status update)\b/.test(l)) return 'communication';
  if (/\b(code|build|develop|function|app|api|script|debug|refactor|implement|engineer|program)\b/.test(l)) return 'coding';
  if (/\b(market|campaign|ad|copy|brand|pitch|sales|cold email|outreach|convert|landing page)\b/.test(l)) return 'marketing';
  if (/\b(analyz|review|compar|evaluat|assess|audit|diagnos)\b/.test(l)) return 'analysis';
  if (/\b(plan|strateg|roadmap|framework|steps to|guide to|system|scale|grow)\b/.test(l)) return 'strategy';
  if (/\b(brainstorm|ideas|creative|concept|innovat|name|slogan|invent|design)\b/.test(l)) return 'creative';
  if (/\b(explain|teach|learn|understand|break down|simplif|what is|how does|tutorial)\b/.test(l)) return 'education';
  if (/\b(research|study|findings|literature|survey|investigate|explore|discover)\b/.test(l)) return 'research';
  if (/\b(email|message|write to|send to|reply|follow.?up|reach out)\b/.test(l)) return 'email';
  return 'writing';
}

/* ─── PROMPT SCORE ──────────────────────────── */
function calcScore(prompt: string): number {
  let s = 7.0;
  const len = prompt.length;
  if (len > 400)  s += 0.3;
  if (len > 800)  s += 0.3;
  if (len > 1200) s += 0.2;
  if (len > 1800) s += 0.1;
  if (prompt.includes('<role>'))             s += 0.3;
  if (prompt.includes('<pre_work>'))         s += 0.3;
  if (prompt.includes('<constraints>'))      s += 0.2;
  if (prompt.includes('<output_format>'))    s += 0.2;
  if (prompt.includes('<quality_standard>')) s += 0.2;
  if (/\d+%/.test(prompt))                   s += 0.15;
  if (/\d+ years/.test(prompt))              s += 0.1;
  if (/Do NOT/i.test(prompt))                s += 0.1;
  if ((prompt.match(/<[a-z_]+>/g) || []).length >= 5) s += 0.15;
  return Math.min(9.9, Math.max(7.8, +s.toFixed(1)));
}

/* ─── IMPROVE-MODE SYSTEM PROMPT ────────────── */
function buildImprovePrompt(): string {
  return `You are a master prompt architect. The user has given you an existing prompt — your job is to rebuild it from first principles until it operates at a 9.5/10 level.

STEP 1 — DIAGNOSE (do this mentally, don't write it out):
Read the prompt and identify every place it is:
- Vague: a verb without a measurable outcome ("write a report" vs "write a 3-section report leading with the conclusion")
- Generic: could apply to any situation, not THIS one
- Missing: no role, no stakes, no failure conditions, no binary quality bar
- Weak constraints: "be concise" instead of "never exceed 150 words per section — readers stop reading after that"

STEP 2 — REBUILD with all of these, in order:

<role>
Not a job title — a person. Include:
• Named specialty tied to THIS exact task (not "expert in X" — "built 40+ X systems that survived Y condition")
• A character trait they physically cannot suppress ("you have zero tolerance for placeholder logic")
• What this expert REFUSES to do under any circumstances
• 2-3 real metrics that prove they're the right person (%, $, users, years, failures survived)
</role>

<context>
Decode the INTENT, not just the words. For every key phrase in the original prompt, ask: what does this really mean about the situation?
• "my boss" → power asymmetry, political sensitivity, approval needed
• "quickly" → deadline pressure changes the tradeoffs
• Any tool named → must use it, not suggest alternatives
Synthesize: who is the audience, what do they fear, what is the real stake?
</context>

<objective>
One sentence: [action verb] + [specific output] + [for whom] + [to achieve what measurable result]
</objective>

<pre_work>
Task-specific thinking before any output. Match the mode to the task:
• CODING → "Map data flow end-to-end. List the 3 most likely runtime failures. State your architecture before writing line 1."
• WRITING/COMMUNICATION → "Identify the reader's actual unstated question. Determine what they must feel by the last sentence. Write the ending first."
• ANALYSIS → "Form 3 competing hypotheses. State what evidence would disprove each. Only then examine the data."
• NEGOTIATION → "Model the other party's incentives, fears, and best alternative. Name the 2 sentences that end this conversation badly."
• STRATEGY → "Find the binding constraint — the one thing that, if removed, changes everything. Sequence reversible actions before irreversible ones."
• CREATIVE → "Generate the 3 most obvious approaches. Veto all of them. Ask: what would this look like if done nowhere else?"
Pick the right mode. Combine modes for hybrid tasks.
</pre_work>

<task>
6-9 numbered steps. Every step must:
1. Reference specifics from context — never generic instructions
2. Name what it builds on ("using the architecture from step 2...")
3. End with a concrete, verifiable sub-output
4. For code: name the exact library, pattern, and file
5. Final step must always be: "Verify each quality criterion below is met before delivering"
</task>

<constraints>
8+ rules. Ordered by criticality — most catastrophic failure first.
Format for each: "Do NOT [exact behavior] — [specific reason it destroys value in THIS context]"
Never write generic constraints. Every rule must be obviously specific to this task.
</constraints>

<output_format>
Name every section, subsection, length, and format. Leave nothing to interpretation.
Code: project tree + file reading order. Analysis: Pyramid Principle structure. Writing: section names + word counts.
</output_format>

<quality_standard>
4-6 criteria. Each must be BINARY — pass or fail, no gray area.
Format: "[Specific person] [specific observable action]"
Example: "A skeptical CFO reads the executive summary and can make the decision without reading further."
Never write: "high quality", "professional", "comprehensive" — these are not testable.
</quality_standard>

Output ONLY the rebuilt prompt — no preamble, no explanation, no meta-commentary.`;
}

/* ─── META PROMPT ───────────────────────────── */
function buildMetaPrompt(): string {
  return `You are a world-class prompt architect. Your job: decode what the user actually needs (not what they said), then build a prompt that forces a 9.5/10 output every time.

━━━ PHASE 1 — DECODE (mental only, never write this out) ━━━
For every element of the request, ask the deeper question:
• What outcome does this person need — not what did they ask for?
• Who is the final reader and what would make this response useless or embarrassing to them?
• What constraint is implied but not stated?
• What is the single most important thing this prompt must NOT get wrong?

Inference rules — apply these before writing anything:
• "my boss / client / partner" → power asymmetry exists. Political sensitivity required.
• "quickly / ASAP / by tomorrow" → deadline pressure changes ALL tradeoffs. Speed beats perfection.
• Any named tool or platform → must use it. Never suggest an alternative.
• "professional / formal" → precision over warmth. Eliminate all personality inflation.
• "simple / easy" → Feynman calibration. No jargon. Would a sharp 14-year-old follow every step?
• Every number the user mentioned → appears verbatim. Non-negotiable.
• If the task produces something a specific person will READ/USE → that person must appear in the prompt with their specific fear or concern, not just their job title.

━━━ PHASE 2 — BUILD ━━━
Write all 9 sections below, in order. Every section must be specific to THIS task — zero generic filler.

<role>
Not a job title — a PERSON. Include ALL of:
• Named specialty tied to THIS task ("built 40+ X systems that survived Y failure condition")
• ONE character trait that is their professional identity (something they physically cannot suppress)
• What this expert REFUSES to do (defines their standard more precisely than what they do)
• 2–3 real metrics: %, $, years, failure conditions survived
</role>

<context>
SYNTHESIZE — do not echo. For each key element, state its IMPLICATION:
• Named person → what does that relationship change about tone and risk?
• Named deadline → what tradeoffs does that force?
• Named tool → what hard constraints does that create?
Final statement: who is the final reader, what do they fear, what is the real stake if this output fails?
</context>

<objective>
ONE sentence. Rigid format:
[action verb] + [specific output type] + [for whom with specific concern] + [to achieve what measurable result]
✗ Wrong: "Write a good email"
✓ Right: "Draft a 120-word meeting-request email to a skeptical VP who has rejected the last 3 vendor meetings, to secure a 30-minute slot within 48 hours"
</objective>

<pre_work>
CRITICAL: Match the thinking protocol to the task type. Combine for hybrid tasks. Never use generic pre_work.

• CODING →
  "COVERAGE PASS (do this first): Write ALL function signatures and interfaces with no implementation. List every data flow boundary. Name the 3 most likely runtime failures and the exact line where each would occur.
  IMPLEMENTATION PASS: Return to implement each function in the order they were declared.
  REASON: Writing 70% of the code then running out of context is the #1 coding prompt failure mode. Coverage-first prevents it."

• WRITING / COMMUNICATION →
  "Identify the reader's actual UNSTATED question (the thing they need to understand but didn't ask). Decide what they must FEEL by the last sentence before writing the first. Draft the ending first, then build backwards.
  REASON: Writing chronologically produces conclusions that are discovered rather than engineered."

• ANALYSIS →
  "Form 3 competing hypotheses. For each, state what evidence would DISPROVE it (not confirm it). Only then examine the data.
  For every finding: assign confidence level — HIGH (multiple independent sources confirm), MEDIUM (one strong indicator), LOW (inference from limited data).
  REASON: Seeking confirmation produces analysis; seeking disconfirmation produces insight."

• NEGOTIATION →
  "Model the other party's incentives, fears, and BATNA before drafting anything. Name the 2 sentences that end this conversation badly. Name the 1 sentence that, if said, makes agreement inevitable.
  REASON: Most negotiation failures happen in the first 30 words."

• STRATEGY →
  "Find the binding constraint — the one bottleneck that, if removed, changes everything else. Sequence reversible decisions before irreversible ones. Map second-order effects of the top recommendation.
  REASON: Treating all priorities as equal is the signature of strategy that never gets executed."

• CREATIVE →
  "Generate the 3 most obvious creative directions. Reject all of them explicitly. Ask: what would this look like if it existed nowhere else?
  REASON: The first 3 ideas are always what the brief says, not what the problem needs."

• RESEARCH →
  "State the hypothesis the client already believes. Identify the 2 most likely confirmation biases. Define 'sufficient evidence to change the recommendation' before looking at any data.
  REASON: Undefined success criteria produce research that confirms whatever was believed before it started."

• EDUCATION →
  "Map the learner's current mental model in 1 sentence. Identify the one misconception that, if uncorrected, makes everything else false. Build from that correction outward.
  REASON: Teaching content without correcting the prior misconception produces a learner who can repeat words but not apply them."
</pre_work>

<task>
6–9 numbered steps. Each step MUST:
1. Reference a specific detail from <context> or <objective> — never a generic verb
2. State what it builds on: "Using the [X] from step 2, now..."
3. End with a concrete, verifiable sub-output (not a direction — a result you can hold)
4. For code: name the exact library, pattern, and file
Step N (always last): "Verify every criterion in <quality_standard> is met. If any criterion fails, identify which step produced the failure and fix it before delivering."
</task>

<constraints>
8+ rules. Order by catastrophic failure risk — most damaging first.
Format: "Do NOT [exact behavior] — [specific reason this destroys value for THIS reader in THIS context]"
Every rule must be obviously specific to this task. Generic constraints ("be concise", "be professional") are FORBIDDEN.
✗ Bad: "Be concise"
✓ Good: "Do NOT exceed 150 words — the reader scans the first paragraph and decides whether to keep reading; word 151 never gets read"
</constraints>

<output_format>
Name every section, every subsection, every length, every format. Nothing left to interpretation.
• Writing: section names + exact word counts
• Code: project structure + file reading order + example usage
• Analysis: Pyramid Principle — conclusion first, evidence second, recommendation last
• Email: subject line formula + body structure + hard word cap
• For format-sensitive tasks (specific schema, JSON, table, template): include 1 short example showing the exact format expected
• For reasoning-heavy tasks (strategy, analysis, negotiation): do NOT include examples — they constrain rather than guide
</output_format>

<quality_standard>
4–6 criteria. Each must be BINARY — passes or fails, no gray area.
Format: "[Specific person] [specific observable action without adjectives]"
✓ Good: "A skeptical CFO reads only the executive summary and has enough information to make the go/no-go decision"
✓ Good: "A developer copies the code into their editor, runs it once, and it executes without modification"
✗ Bad: "The output is professional and high-quality" — not testable
NEVER use: high quality, professional, comprehensive, thorough, excellent, well-written — these are wishes, not criteria.
</quality_standard>

<critical_reminders>
[MEMORY ANCHOR — repeat the 3 most important constraints from this prompt here, verbatim]
This section exists because research shows 30% accuracy loss when key constraints appear only in the middle of a prompt.
Write the 3 most critical rules again at the end so they anchor in working memory.
</critical_reminders>

<output_primer>
End the prompt with: "Begin your response with: [the exact first 8–12 words that signal the correct format, register, and approach]"
Calibrate to task:
• Email → "Begin with: 'Subject: [formula]'"
• Analysis → "Begin with: 'Executive summary: [conclusion first]'"
• Code → "Begin with: '// Architecture overview:'"
• Strategy → "Begin with: 'The binding constraint is:'"
• Negotiation → "Begin with: '[Acknowledge their position in ≤10 words]'"
</output_primer>

NON-NEGOTIABLE RULES:
- Output ONLY the prompt — zero preamble, zero explanation, zero commentary after
- Write addressed to the AI ("You are...", "Your task is...")
- Every number the user mentioned appears verbatim
- <pre_work> ALWAYS matches the task type — never generic
- Final audience person is named with their SPECIFIC concern or fear, not just job title

Transform this into a master prompt:`;
}

/* ─── BUILD QUESTION SYSTEM PROMPT ─────────── */
function buildQuestionSystemPrompt(raw: string, conv: Conv[], profile: Profile | null): string {
  const convText = conv
    .map((c, i) => `Q${i + 1}: ${c.q}\nA${i + 1}: ${c.a}`)
    .join('\n\n');

  const profileBlock = profile
    ? `\nUSER PROFILE (already known — NEVER ask about any of this): ${profile.role} in ${profile.industry}. Tools they use: ${profile.tools}. Core goal: ${profile.goals}.\n`
    : '';

  const exchangeCount = conv.length;

  return `You are the sharpest requirements analyst alive. You've processed 100,000 briefs. You know exactly what separates a prompt that changes the outcome from one that gets ignored.
${profileBlock}
USER'S TASK: "${raw}"
${exchangeCount > 0 ? `\nCONVERSATION SO FAR:\n${convText}` : ''}

━━━ PHASE 1 — SIGNAL EXTRACTION (internal reasoning only — never output this) ━━━

Read the task and extract every signal present:
• Named people or roles ("my boss", "the client", "Sarah", "the board") → power dynamics, relationship type, approval chain
• Named tools or platforms ("in Slack", "for LinkedIn", "in Python") → hard format/environment constraints
• Time pressure words ("ASAP", "by Friday", "quickly", "urgent") → what breaks if deadline is missed
• Emotion signals ("need help", "struggling", "keep getting rejected") → past failures, what's gone wrong before
• Vague quality words ("good", "professional", "better", "improve") → proxy for something specific — what outcome do they actually need?
• Conspicuous absences → no audience mentioned? no format? no deadline? no constraint? The gap IS the question.
• Numbers and specifics already given → use these to anchor your question to their exact situation
• Implied relationships → "asking for a raise" implies a boss with authority, "cold outreach" implies a skeptical stranger

━━━ PHASE 2 — GAP SCORING (internal — never output) ━━━

Score each dimension 0–2:
  0 = completely unknown
  1 = implied or guessable from context
  2 = explicitly stated

STAKES (0-2):    What breaks if this fails — job loss, revenue drop, relationship damage, missed deadline?
READER (0-2):    Who reads the final output — their specific role, their fear, what makes them immediately reject it?
CONSTRAINT (0-2): What hard limit exists — length ceiling, tool it must work in, what must NOT appear?
SPECIFIC (0-2):  What concrete detail makes this unique — a name, number, company, past attempt, exact context?
FORMAT (0-2):    What exactly is delivered — email, doc, script, post, code — and in what length/structure?

━━━ PHASE 3 — DECISION ━━━

Signal READY (single word only) if ALL are true:
  ✓ STAKES ≥ 1
  ✓ READER ≥ 1
  ✓ CONSTRAINT ≥ 1
  ✓ SPECIFIC = 2
  ✓ FORMAT ≥ 1
  ✓ At least 2 exchanges completed (current: ${exchangeCount})

Force READY if exchanges ≥ 3 — more questions create diminishing returns.
If ANY score is 0 AND exchanges < 3: ask one more question targeting the lowest-scored, highest-leverage gap.

━━━ PHASE 4 — QUESTION CONSTRUCTION (if not READY) ━━━

Target the dimension with score 0 that has the highest leverage on the final prompt quality.

Rules for your question:
• Open with the user's EXACT words from their input — "You said [exact phrase]..." or "You mentioned [exact word]..."
• Force a concrete fact, never a preference or opinion
• Under 20 words total
• Sound like a sharp advisor who's seen 10,000 of these, not a form

Question patterns by gap type — adapt these, never copy verbatim:

STAKES = 0:
→ "What's the worst personal consequence if this fails — job risk, revenue loss, or something else?"
→ "You mentioned [exact phrase] — what's riding on this going well for you specifically?"

READER = 0:
→ "Who reads the final output — and what's the one thing that would make them immediately dismiss it?"
→ "You said [exact word] — who specifically is the decision-maker here, and what do they care about most?"

CONSTRAINT = 0:
→ "What's the one thing this absolutely cannot include — and is there a hard length or format ceiling?"
→ "You mentioned [tool/platform] — is that a hard requirement or a preference you'd drop for a better result?"

SPECIFIC = 0:
→ "What's the concrete detail that makes this different from every similar [task type] — a name, number, or what's already been tried?"
→ "What have you already tried that didn't work, and what specifically went wrong with it?"

FORMAT = 0:
→ "Where does this live when it's done — email, doc, slide, post — and what's the length ceiling?"
→ "What exactly do you hand over — is it a document, a message, a script, code?"

For inputs involving real people (boss, client, investor, colleague):
→ ALWAYS ask about the relationship + their single biggest concern if READER = 0
→ "You mentioned [person] — what's your relationship with them, and what's the one thing they care about most right now?"

For inputs with past failure signals ("keep getting rejected", "tried before", "doesn't work"):
→ Ask about the failure before anything else — it contains every constraint
→ "You said [failure phrase] — what specifically went wrong last time?"

NEVER ask:
• "What's your goal?" — they told you already
• "What tone do you prefer?" — ask about READER reaction instead
• "Can you be more specific?" — too vague, wastes an exchange
• Anything the conversation already answered
• Anything the user profile already covers
• Yes/no questions — every question must force a specific usable fact

Output ONLY: the single question (under 20 words) OR the single word READY. No preamble. No numbering.`;
}

/* ─── AUTO-CRITIQUE PROMPT ─────────────────── */
function buildCritiquePrompt(type: string): string {
  return `You are a ruthless prompt quality auditor. You have one job: find the weakest sections of this AI prompt and fix them.

Evaluate against these 7 criteria — assign PASS or FAIL to each:

1. SPECIFICITY
   FAIL if any section uses vague adjectives: "good", "professional", "high-quality", "comprehensive", "thorough", "appropriate", "excellent", "well-written". These words are invisible to an AI.
   PASS if every instruction specifies exact behavior, length, format, or observable outcome.

2. OUTPUT_PRIMER
   FAIL if the prompt does NOT end with the first exact words the AI should say.
   PASS if the prompt ends with: 'Begin your response with: "[first 8-12 words calibrated to this task type: ${type}]"'

3. CONSTRAINT_DEPTH
   FAIL if any constraint does not explain WHY it exists for this specific task.
   "Be concise" = FAIL. "Do not exceed 150 words — the reader stops reading at paragraph 3" = PASS.

4. AUDIENCE_PRECISION
   FAIL if the final reader is described only by job title without a specific fear, goal, or concern.
   "A busy VP" = FAIL. "A VP who rejected the last 3 proposals because they lacked ROI specifics" = PASS.

5. MEASURABLE_QUALITY
   FAIL if any quality criterion uses adjectives instead of observable actions.
   "The response is professional" = FAIL. "A first-time reader completes the task without asking a follow-up question" = PASS.

6. MEMORY_ANCHOR
   FAIL if the 3 most critical constraints do NOT appear at both the START and END of the prompt.
   Key instructions buried only in the middle lose 30% of their effectiveness.
   PASS if the critical constraints are restated in a final section at the end.

7. PRE_WORK_MATCH
   FAIL if the <pre_work> section is generic ("identify dependencies", "map the task").
   PASS if the <pre_work> section uses the task-specific thinking protocol for: ${type}.
   For CODING: coverage pass (signatures first) then implementation pass.
   For ANALYSIS: 3 competing hypotheses + confidence levels (HIGH/MEDIUM/LOW) on every finding.
   For WRITING: reader's unstated question + draft the ending first.
   For NEGOTIATION: model BATNA + name 2 sentences that end this badly.

For EVERY criterion marked FAIL:
— Quote the specific section that fails (in quotes)
— Write the complete replacement text

Then output the COMPLETE revised prompt with every fix applied — all sections included, nothing removed.
Output ONLY the revised prompt. No audit report. No preamble. No commentary after. Just the prompt.`;
}

/* ─── MODEL-AWARE META PROMPT ───────────────── */
function buildMetaPromptForModel(model: TargetModel, profile: Profile | null): string {
  let base = buildMetaPrompt();

  if (profile) {
    const profileContext = `\nUSER CONTEXT: ${profile.role} in ${profile.industry}. Tools they use: ${profile.tools}. Their core goal: ${profile.goals}. Tailor every section to this context.\n`;
    base = base.replace('Transform this into a master prompt:', profileContext + '\nTransform this into a master prompt:');
  }

  if (model === 'gpt4') {
    base += '\n\nFORMAT FOR GPT-4o: Use markdown headers (## Role, ## Context, etc.) instead of XML tags. Add a [SYSTEM] block at the top. Use numbered lists.';
  } else if (model === 'gemini') {
    base += '\n\nFORMAT FOR GEMINI: Use conversational framing (\'You are an expert in X...\'). Use bullet points. Add \'Think step by step before responding.\' at the end.';
  }

  return base;
}

function getRole(type: string): string {
  const r: Record<string,string> = {
    negotiation:'You are a career strategist and former HR Director with 22 years of compensation negotiations. You have coached 400+ professionals to an average 23% raise.',
    communication:'You are an executive communications coach and former Chief People Officer. You have guided 300+ professionals through high-stakes conversations and kept every relationship intact.',
    coding:'You are a Principal Software Engineer with 18 years at Google and Stripe. You write clean, secure, maintainable code with zero tolerance for unhandled exceptions.',
    marketing:'You are a direct-response copywriter with 20 years of experience. Your campaigns have generated $500M+ in revenue. Every word is doing a specific job.',
    analysis:'You are a senior strategy analyst trained at McKinsey. You write Pyramid Principle: conclusion first, evidence second. Every recommendation specifies who acts, by when.',
    strategy:'You are an operator and growth strategist who founded two companies ($0–$30M ARR) and advised 60+ startups. You think in constraints and binding bottlenecks.',
    creative:'You are an Executive Creative Director with 22 years at Wieden+Kennedy. You have a pathological intolerance for the obvious first idea.',
    education:'You are a science communicator with a PhD in Cognitive Science and three bestselling books. You deploy the Feynman Technique by instinct.',
    writing:'You are a professional writer with 20 years of bylines in The Atlantic and Harvard Business Review. The first draft is always too long.',
    research:'You are a senior research analyst who has synthesized 10,000+ industry reports for Fortune 500 boards. Your first instinct is to triangulate and challenge assumptions.',
    email:'You are an email strategist who has optimized 50,000+ outreach campaigns. Your open rates run 40% above industry average. Every word earns its place.',
  };
  return r[type] || r.writing;
}

function getObjective(type: string, raw: string): string {
  const o: Record<string,string> = {
    negotiation:'One send-ready email under 150 words. Its only job: get the meeting.',
    communication:'One clear, complete message that delivers the core news and opens the path forward.',
    marketing:'Copy that earns the next sentence in the first 8 words and ends with one unmistakable CTA.',
    analysis:'Structured analysis: conclusion first, evidence second, recommendations last. Actionable today.',
    strategy:'Clear strategy: diagnosis, priorities, 30/60/90-day actions with owners and success metrics.',
    coding:'Working, production-quality code with usage example and edge cases handled.',
    writing:'A complete, publication-ready piece that earns every reader\'s attention from the first sentence.',
    creative:'3 distinct creative territories — not executions — each with a concept and rationale.',
    education:'An explanation that leaves the reader genuinely understanding, not just nodding along.',
    research:'Synthesized intelligence that directly informs the decision — not a literature dump.',
    email:'A sent-ready email under 100 words with one clear, unmissable ask.',
  };
  return o[type] || `A complete, expert-level response to: "${raw}". Professional bar. No filler.`;
}

function getConstraints(type: string): string {
  const c: Record<string,string> = {
    negotiation:'No: "deserve," "I just wanted to…," apologies, salary comparisons, ranges. 150-word maximum.',
    communication:'No: buried headlines, passive accountability, over-apologising, vague next steps, character judgements.',
    marketing:'No: "game-changer," "revolutionary," "seamless," passive voice, unsupported claims, weak CTAs.',
    analysis:'No: vague conclusions, unsupported assertions, buried recommendations, jargon without definition.',
    strategy:'No: generic frameworks, recommendations without owners, strategy-speak, treating every priority as top.',
    coding:'No: pseudocode, placeholder comments, generic variable names, silent exception swallowing, over-engineering.',
    writing:'No: "in conclusion," "it is important to note," passive voice when active works, summaries instead of resonance.',
    creative:'No: first ideas, work a cautious brand manager would love, executions without a concept.',
    education:'No: jargon without definition, skipped logical steps, condescension, "simply" / "obviously."',
    research:'No: unsourced claims, summary without synthesis, confirmation bias, recommendations without evidence.',
    email:'No: lengthy preamble, multiple asks, vague subject lines, passive voice, apologetic openers.',
  };
  return c[type] || 'No filler, passive voice, or vague language. Precise and direct.';
}

function getFormat(type: string): string {
  const f: Record<string,string> = {
    negotiation:'(a) Subject line + rationale. (b) Complete email, zero placeholders, under 150 words. (c) Follow-up if no reply in 5 days.',
    communication:'(a) Core message in one sentence. (b) Complete message or script, ready to use. (c) The one phrase NOT to say.',
    marketing:'(a) 3 subject/headline options — label the formula. (b) Full copy: hook, body, CTA. (c) Key strategic choice made.',
    analysis:'(a) Executive Summary — 3 bullets max. (b) Structured analysis, MECE. (c) Recommendations: Action | Owner | Timeline | Metric.',
    strategy:'(a) Diagnosis. (b) Binding constraint. (c) Top 3 priorities ranked. (d) 30/60/90-day plan. (e) Risk register.',
    coding:'(a) Architecture note in 2-3 lines. (b) Full implementation with comments. (c) Usage example. (d) Edge cases.',
    writing:'Complete piece: commanding opening, developed middle, resonant close. Include a suggested headline.',
    creative:'(a) 3 territories — named, concept, rationale. (b) Recommended direction with sketch. (c) Why this, not the others.',
    education:'(a) Keystone concept. (b) The analogy. (c) Layered explanation. (d) 3 misconceptions addressed. (e) Sticky summary.',
    research:'(a) Key findings — 5 bullets max. (b) Evidence map. (c) Synthesis. (d) Decision implications.',
    email:'(a) Subject line with formula label. (b) Complete email. (c) One-line follow-up if no reply.',
  };
  return f[type] || 'A complete, structured response appropriate to the task.';
}

function getQuality(type: string): string {
  const q: Record<string,string> = {
    negotiation:'A direct manager reads it and thinks: "Short, specific, confident. I can work with this."',
    communication:'A neutral observer says: "That\'s how a professional handles a hard situation." Relationship survives.',
    marketing:'A sceptical CMO reads it and says: "Yes, send it." Every sentence doing a job.',
    analysis:'A CFO challenges any point and finds it defensible. Recommendations are specific enough to act on today.',
    strategy:'A team lead receives this and starts working Monday without a follow-up meeting.',
    coding:'A senior engineer reviews this PR and approves it. No pseudocode, no TODOs, no unhandled edge cases.',
    writing:'Could run in a respected publication with light editing. Precise, structured, no sentence is padding.',
    creative:'A good creative director leans forward. Original without being alienating, strategic without being soulless.',
    education:'The reader feels genuinely smarter — with a mental model they can explain to someone else tomorrow.',
    research:'A board member reads this and says: "This changes how I\'d vote on the decision."',
    email:'The recipient opens it, reads it once, and knows exactly what to do next.',
  };
  return q[type] || 'Precise, structured, every sentence earning its place.';
}

function buildOfflinePrompt(raw: string, conv: Conv[], type: string): string {
  const role = getRole(type);
  const contextLines = conv.map(c => `  — ${c.a}`);

  return [
    '<role>',`  ${role}`,'</role>','',
    '<context>',
    `  Task: "${raw}"`,
    ...contextLines,
    '</context>','',
    '<objective>',`  ${getObjective(type, raw)}`,'</objective>','',
    '<task>',
    '  1. Address the task directly and completely.',
    '  2. Apply your expert role throughout every sentence.',
    '  3. Reference the specific context provided above.',
    '  4. Prioritize precision and actionability over comprehensiveness.',
    '  5. Every paragraph must earn its place.',
    '</task>','',
    '<constraints>',`  ${getConstraints(type)}`,'</constraints>','',
    '<output_format>',`  ${getFormat(type)}`,'</output_format>','',
    '<quality_standard>',`  ${getQuality(type)}`,'</quality_standard>',
  ].join('\n');
}

/* ─── BUILD USER CONTENT ────────────────────── */
function buildUserContentDynamic(raw: string, conv: Conv[], pasteCtx = ''): string {
  let content = raw;
  if (conv.length > 0) {
    content += '\n\nContext from our conversation:\n';
    conv.forEach(({ q, a }) => {
      content += `\nQ: ${q}\nA: ${a}`;
    });
  }
  if (pasteCtx.trim()) {
    content += `\n\nReference material provided:\n${pasteCtx.trim()}`;
  }
  return content;
}

/* ─── STREAMING FETCH ───────────────────────── */
async function streamFetch(
  userContent: string,
  systemPrompt: string,
  onChunk: (full: string) => void,
  useThinking = false
): Promise<string> {
  const res = await fetch('/api/transform', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userContent, systemPrompt, stream: true, useThinking }),
  });
  if (!res.ok) throw new Error('API ' + res.status);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buf  = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const d = line.slice(6).trim();
      if (d === '[DONE]') return full;
      try {
        const parsed = JSON.parse(d);
        if (parsed.t) { full += parsed.t; onChunk(full); }
      } catch { /* skip malformed */ }
    }
  }
  return full;
}

/* ─── HISTORY ───────────────────────────────── */
const HIST_KEY    = 'gm_hist_v3';
const PROFILE_KEY = 'gm_profile_v1';

function loadHistory(): Saved[] {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch { return []; }
}
function saveToHistory(item: Saved) {
  try {
    const h = loadHistory().filter(x => x.id !== item.id);
    localStorage.setItem(HIST_KEY, JSON.stringify([item, ...h].slice(0, 8)));
  } catch {}
}
function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveProfile(p: Profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
}

/* ─── COMPONENT ─────────────────────────────── */
let bubId = 0;

export default function GoatmodePage() {
  /* Core */
  const [screen, setScreen]           = useState<Screen>('input');
  const [rawInput, setRawInput]       = useState('');
  const [inputMode, setInputMode]     = useState<InputMode>('build');

  /* Chat — dynamic conversation */
  const [bubbles, setBubbles]         = useState<Bub[]>([]);
  const [conversation, setConversation] = useState<Conv[]>([]);
  const [currentDynamicQ, setCurrentDynamicQ] = useState('');
  const [qCount, setQCount]           = useState(0);
  const [chatInput, setChatInput]     = useState('');
  const [isGMTyping, setIsGMTyping]   = useState(false);
  const [currentType, setType]        = useState('writing');

  /* Paste context panel */
  const [pasteCtx, setPasteCtx]       = useState('');
  const [showPaste, setShowPaste]     = useState(false);

  /* Output */
  const [prompt, setPrompt]           = useState('');
  const [displayed, setDisplayed]     = useState('');
  const [streamDone, setStreamDone]   = useState(false);
  const [promptScore, setPromptScore] = useState(0);

  /* Thinking */
  const [thinking, setThinking]       = useState(0);
  const [isCritiquing, setIsCritiquing] = useState(false);

  /* History */
  const [history, setHistory]         = useState<Saved[]>([]);

  /* Refine */
  const [refineVal, setRefineVal]     = useState('');
  const [refining, setRefining]       = useState(false);

  /* UI */
  const [copied, setCopied]           = useState(false);
  const [booted, setBooted]           = useState(false);

  /* ── PERSONALIZATION ── */
  const [profile, setProfile]         = useState<Profile | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileForm, setProfileForm] = useState<Profile>({ role: '', industry: '', tools: '', goals: '' });
  const profileRef = useRef<Profile | null>(null);

  /* ── MODEL SELECTOR ── */
  const [targetModel, setTargetModel] = useState<TargetModel>('claude');
  const targetModelRef = useRef<TargetModel>('claude');

  /* ── PROMPT VARIANTS ── */
  const [variantA, setVariantA]             = useState('');
  const [variantB, setVariantB]             = useState('');
  const [activeVariant, setActiveVariant]   = useState<ActiveVariant>('orig');
  const [generatingVariants, setGeneratingVariants] = useState(false);

  /* ── LIVE PREVIEW ── */
  const [previewText, setPreviewText]       = useState('');
  const [showPreview, setShowPreviewState]  = useState(false);
  const [previewStreaming, setPreviewStreaming] = useState(false);

  /* Refs */
  const chatEndRef   = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const pasteCtxRef  = useRef('');

  /* Keep refs in sync */
  useEffect(() => { pasteCtxRef.current = pasteCtx; }, [pasteCtx]);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { targetModelRef.current = targetModel; }, [targetModel]);

  /* Mount */
  useEffect(() => {
    setHistory(loadHistory());
    const saved = loadProfile();
    if (saved) { setProfile(saved); profileRef.current = saved; }
    const t = setTimeout(() => setBooted(true), 2700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [bubbles, isGMTyping]);

  useEffect(() => {
    if (screen === 'chat')  setTimeout(() => chatInputRef.current?.focus(), 100);
    if (screen === 'input') setTimeout(() => textareaRef.current?.focus(), 100);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'thinking') return;
    const lines = isCritiquing ? CRITIQUE_LINES : THINKING_LINES;
    const iv = setInterval(() => setThinking(n => (n + 1) % lines.length), 850);
    return () => clearInterval(iv);
  }, [screen, isCritiquing]);

  /* ── DERIVED ── */
  const getActiveText = useCallback(() => {
    if (activeVariant === 'a' && variantA) return variantA;
    if (activeVariant === 'b' && variantB) return variantB;
    return prompt;
  }, [activeVariant, variantA, variantB, prompt]);

  /* ── CHAT HELPERS ── */
  const addBub = useCallback((role: BubRole, text: string) => {
    setBubbles(prev => [...prev, { id: ++bubId, role, text }]);
  }, []);

  /* ── SHARED OUTPUT FINALISER ── */
  const finaliseOutput = useCallback((p: string, type: string, raw: string) => {
    setPrompt(p);
    setDisplayed(p);
    setPromptScore(calcScore(p));
    setStreamDone(true);
    setScreen('output');
    const item: Saved = { id: Date.now().toString(), raw, prompt: p, type, ts: Date.now() };
    saveToHistory(item);
    setHistory(loadHistory());
  }, []);

  /* ── RUN THE PROMPT ENGINE (TWO-PASS: build → critique → refine) ── */
  const runEngine = useCallback(async (
    userContent: string,
    type: string,
    raw: string,
    sysPrompt: string,
    conv: Conv[] = []
  ) => {
    setScreen('thinking');
    setThinking(0);
    setIsCritiquing(false);
    setStreamDone(false);
    setDisplayed('');
    setVariantA('');
    setVariantB('');
    setActiveVariant('orig');
    setPreviewText('');
    setShowPreviewState(false);

    let draftFull = '';

    try {
      // ── PASS 1: Generate draft silently (stay on thinking screen) ──
      // Pass 1 uses extended thinking — Claude reasons about the task before writing
      const draft = await streamFetch(userContent, sysPrompt, (full) => {
        draftFull = full;
        // Silent — no UI update. User sees THINKING_LINES the whole time.
      }, true);
      const draftText = draft || draftFull;
      if (!draftText || draftText.length < 80) throw new Error('Draft too short');

      // ── PASS 2: Auto-critique streams the refined prompt to output screen ──
      setIsCritiquing(true);
      setThinking(0);

      let critiqueStarted = false;
      let critiqueFull = '';

      try {
        const refined = await streamFetch(
          `Evaluate and improve this prompt:\n\n${draftText}`,
          buildCritiquePrompt(type),
          (full) => {
            critiqueFull = full;
            if (!critiqueStarted) {
              critiqueStarted = true;
              setScreen('output'); // Switch to output when first critique token arrives
            }
            setDisplayed(full);
            setPrompt(full);
          }
        );

        const finalText = refined || critiqueFull;
        // Use critique result only if substantial (at least 40% of draft length)
        const best = (finalText && finalText.length > draftText.length * 0.4) ? finalText : draftText;
        setIsCritiquing(false);
        finaliseOutput(best, type, raw);

      } catch {
        // Critique failed — show draft directly
        setIsCritiquing(false);
        finaliseOutput(draftText, type, raw);
      }

    } catch {
      setIsCritiquing(false);
      const fb = buildOfflinePrompt(raw, conv, type);
      finaliseOutput(fb, type, raw);
    }
  }, [finaliseOutput]);

  /* ── GENERATE NEXT DYNAMIC QUESTION (STREAMING) ── */
  const generateNextQuestion = useCallback(async (
    raw: string,
    conv: Conv[],
    type: string
  ) => {
    setIsGMTyping(true);

    /* Hard cap: after 3 questions, build immediately */
    if (conv.length >= 3) {
      setIsGMTyping(false);
      addBub('ai', 'Got everything I need. Building your prompt now...');
      setTimeout(() => {
        const uc = buildUserContentDynamic(raw, conv, pasteCtxRef.current);
        runEngine(uc, type, raw, buildMetaPromptForModel(targetModelRef.current, profileRef.current), conv);
      }, 380);
      return;
    }

    const systemPrompt = buildQuestionSystemPrompt(raw, conv, profileRef.current);

    /* Streaming question approach */
    let streamBubId = -1;
    let bubCreated  = false;

    try {
      // Question generation uses extended thinking — Claude reasons through all gaps before picking one
      const finalText = await streamFetch(
        'Generate the next question.',
        systemPrompt,
        (full) => {
          if (!bubCreated) {
            /* First token: turn off typing indicator, create bubble */
            setIsGMTyping(false);
            bubCreated = true;
            const newId = ++bubId;
            streamBubId = newId;
            setBubbles(prev => [...prev, { id: newId, role: 'ai' as BubRole, text: full }]);
          } else {
            /* Subsequent tokens: update that bubble */
            setBubbles(prev => prev.map(b =>
              b.id === streamBubId ? { ...b, text: full } : b
            ));
          }
        },
        true  // extended thinking ON
      );

      const response = (finalText || '').trim();

      if (!response || /^READY$/i.test(response) || response.toUpperCase().startsWith('READY')) {
        /* Remove the streaming bubble and replace with "building" message */
        if (bubCreated) {
          setBubbles(prev => prev.filter(b => b.id !== streamBubId));
        }
        setIsGMTyping(false);
        addBub('ai', 'Perfect — I have everything I need. Engineering your prompt now...');
        setTimeout(() => {
          const uc = buildUserContentDynamic(raw, conv, pasteCtxRef.current);
          runEngine(uc, type, raw, buildMetaPromptForModel(targetModelRef.current, profileRef.current), conv);
        }, 380);
      } else {
        setIsGMTyping(false);
        setCurrentDynamicQ(response);
        setQCount(c => c + 1);
        /* Bubble already in the list from streaming, no addBub needed */
      }
    } catch {
      setIsGMTyping(false);
      const words = raw.split(' ').slice(0, 5).join(' ');
      const fallbacks = [
        `Who specifically needs to act on this — and what do they care most about?`,
        `You mentioned "${words}" — what does success look like in concrete terms?`,
        `What's the single biggest constraint I should know before building this?`,
      ];
      const fb = fallbacks[conv.length % fallbacks.length];
      setCurrentDynamicQ(fb);
      setQCount(c => c + 1);
      addBub('ai', fb);
    }
  }, [addBub, runEngine]);

  /* ── START FLOW ── */
  const handleStart = useCallback(async () => {
    const raw = rawInput.trim();
    if (!raw) return;
    const type = detectType(raw);
    setType(type);

    if (inputMode === 'improve') {
      await runEngine(raw, type, raw, buildImprovePrompt());
      return;
    }

    /* Build mode — start dynamic conversation */
    setConversation([]);
    setCurrentDynamicQ('');
    setQCount(0);
    setPasteCtx('');
    setShowPaste(false);
    setBubbles([]);
    setStreamDone(false);
    setScreen('chat');

    setTimeout(() => {
      setIsGMTyping(true);
      setTimeout(() => {
        setIsGMTyping(false);
        addBub('ai', 'On it. Let me ask you a few sharp questions to build this right.');
        setTimeout(() => generateNextQuestion(raw, [], type), 600);
      }, 720);
    }, 280);
  }, [rawInput, inputMode, addBub, generateNextQuestion, runEngine]);

  /* ── ANSWER QUESTION (with vague-answer detection) ── */
  const handleAnswer = useCallback(async (answer: string) => {
    if (!answer.trim()) return;
    setChatInput('');

    /* Check if answer is vague */
    const trimmed = answer.trim();
    const isVague =
      trimmed.split(/\s+/).length < 3 ||
      /^(idk|i don't know|not sure|unsure|no idea|whatever|n\/a|na|yes|no|ok|okay|sure|maybe|-)$/i.test(trimmed);

    addBub('user', answer);

    if (isVague) {
      setTimeout(() => {
        addBub('ai', "That's a bit thin — one specific detail here (a number, name, or example) will make the final prompt much stronger.");
      }, 400);
      return; /* Do NOT advance conversation */
    }

    const newConv: Conv[] = [...conversation, { q: currentDynamicQ, a: answer }];
    setConversation(newConv);

    await generateNextQuestion(rawInput, newConv, currentType);
  }, [conversation, currentDynamicQ, rawInput, currentType, addBub, generateNextQuestion]);

  /* ── SKIP ── */
  const handleSkip = useCallback(async () => {
    const uc = buildUserContentDynamic(rawInput, conversation, pasteCtxRef.current);
    await runEngine(uc, currentType, rawInput, buildMetaPromptForModel(targetModelRef.current, profileRef.current), conversation);
  }, [rawInput, conversation, currentType, runEngine]);

  /* ── OUTPUT ACTIONS ── */
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(getActiveText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }, [getActiveText]);

  const openInClaude = useCallback(() => {
    navigator.clipboard.writeText(getActiveText()).then(() => window.open('https://claude.ai/new', '_blank'));
  }, [getActiveText]);

  const openInChatGPT = useCallback(() => {
    navigator.clipboard.writeText(getActiveText()).then(() => window.open('https://chatgpt.com/', '_blank'));
  }, [getActiveText]);

  const handleRefine = useCallback(async (instruction: string) => {
    if (!instruction.trim() || refining) return;
    setRefining(true);
    setStreamDone(false);
    setRefineVal('');
    try {
      const res = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userContent: `Refine this prompt per the instruction: "${instruction}"\n\nOriginal:\n${getActiveText()}`,
          systemPrompt: 'You are a prompt engineer. Apply the instruction to refine the prompt. Keep the XML structure. Output ONLY the refined prompt — no explanation.',
        }),
      });
      const data = await res.json();
      if (data.text) {
        setPrompt(data.text);
        setVariantA('');
        setVariantB('');
        setActiveVariant('orig');
        setDisplayed('');
        setPromptScore(calcScore(data.text));
        let i = 0;
        const tick = () => {
          if (i >= data.text.length) { setStreamDone(true); return; }
          const chunk = Math.min(22, data.text.length - i);
          setDisplayed(data.text.slice(0, i + chunk));
          i += chunk;
          setTimeout(tick, 16);
        };
        setTimeout(tick, 60);
      }
    } catch { setStreamDone(true); }
    setRefining(false);
  }, [getActiveText, refining]);

  /* ── GENERATE VARIANTS ── */
  const generateVariants = useCallback(async () => {
    if (generatingVariants) return;
    setGeneratingVariants(true);
    setActiveVariant('orig');

    const baseMetaPrompt = buildMetaPromptForModel(targetModelRef.current, profileRef.current);
    const userContent    = buildUserContentDynamic(rawInput, conversation, pasteCtxRef.current);

    const sysA = baseMetaPrompt + '\n\nVARIANT INSTRUCTION: Make this MORE comprehensive. Add more specific steps, explicit examples, and deeper constraints. Push specificity further.';
    const sysB = baseMetaPrompt + '\n\nVARIANT INSTRUCTION: Make this TIGHTER. Cut 30% of words. Every sentence earns its place. Zero redundancy. Maximum precision.';

    try {
      const [resA, resB] = await Promise.all([
        fetch('/api/transform', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userContent, systemPrompt: sysA }),
        }),
        fetch('/api/transform', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userContent, systemPrompt: sysB }),
        }),
      ]);

      const [dataA, dataB] = await Promise.all([resA.json(), resB.json()]);
      if (dataA.text) setVariantA(dataA.text);
      if (dataB.text) setVariantB(dataB.text);
    } catch { /* silently fail */ }

    setGeneratingVariants(false);
  }, [rawInput, conversation, generatingVariants]);

  /* ── SWITCH MODEL ── */
  const handleModelSwitch = useCallback(async (model: TargetModel) => {
    if (model === targetModel) return;
    setTargetModel(model);
    targetModelRef.current = model;
    /* Reset variants */
    setVariantA('');
    setVariantB('');
    setActiveVariant('orig');
    setPreviewText('');
    setShowPreviewState(false);
    /* Re-generate with new model system prompt */
    const uc = buildUserContentDynamic(rawInput, conversation, pasteCtxRef.current);
    await runEngine(uc, currentType, rawInput, buildMetaPromptForModel(model, profileRef.current), conversation);
  }, [targetModel, rawInput, conversation, currentType, runEngine]);

  /* ── LIVE PREVIEW ── */
  const runPreview = useCallback(async () => {
    if (previewStreaming) return;
    setShowPreviewState(true);
    setPreviewText('');
    setPreviewStreaming(true);

    const activePromptText = getActiveText();

    try {
      await streamFetch(
        'Give a concise 150-200 word demonstration showing how you would START this task. Show your thinking approach, not a full output.',
        activePromptText,
        (full) => { setPreviewText(full); }
      );
    } catch {
      setPreviewText('Preview failed — check your connection and try again.');
    }

    setPreviewStreaming(false);
  }, [getActiveText, previewStreaming]);

  /* ── GO HOME ── */
  const goHome = useCallback(() => {
    setScreen('input');
    setRawInput('');
    setBubbles([]);
    setConversation([]);
    setCurrentDynamicQ('');
    setQCount(0);
    setPasteCtx('');
    setShowPaste(false);
    setPrompt('');
    setDisplayed('');
    setStreamDone(false);
    setIsGMTyping(false);
    setInputMode('build');
    /* Reset variants */
    setVariantA('');
    setVariantB('');
    setActiveVariant('orig');
    /* Reset preview */
    setPreviewText('');
    setShowPreviewState(false);
    setPreviewStreaming(false);
    /* Reset model */
    setTargetModel('claude');
    targetModelRef.current = 'claude';
  }, []);

  /* ── PROFILE HANDLERS ── */
  const handleProfileSave = useCallback(() => {
    const trimmed: Profile = {
      role: profileForm.role.trim(),
      industry: profileForm.industry.trim(),
      tools: profileForm.tools.trim(),
      goals: profileForm.goals.trim(),
    };
    if (!trimmed.role && !trimmed.industry) return;
    setProfile(trimmed);
    profileRef.current = trimmed;
    saveProfile(trimmed);
    setShowProfileSetup(false);
  }, [profileForm]);

  const handleProfileEdit = useCallback(() => {
    if (profile) setProfileForm({ ...profile });
    setShowProfileSetup(true);
  }, [profile]);

  /* ── DERIVED ── */
  const liveType   = rawInput.length > 8 ? detectType(rawInput) : null;
  const techniques = TECHNIQUES[currentType] || TECHNIQUES.writing;
  const activeText = getActiveText();
  const wordCount  = activeText.trim() ? activeText.trim().split(/\s+/).length : 0;

  /* ─── JSX ─────────────────────────────────── */
  const GoatLogo = ({ w = 52, h = 60 }: { w?: number; h?: number }) => (
    <svg width={w} height={h} viewBox="0 0 100 115" fill="currentColor">
      <path d="M50 4 C51 12 51.8 26 52 42 C52.2 58 51.8 76 51.2 90 C50.8 102 50 113 50 114 C49.2 102 49 90 48.8 76 C48.2 58 47.8 42 48 26 C48.2 12 49 4 50 4Z"/>
      <path d="M45 12 C28 7, 7 20, 5 40 C3 56, 10 70, 22 76 L30 70 C20 64, 14 52, 15 38 C16 24, 28 15, 45 12Z"/>
      <path d="M55 12 C72 7, 93 20, 95 40 C97 56, 90 70, 78 76 L70 70 C80 64, 86 52, 85 38 C84 24, 72 15, 55 12Z"/>
      <path d="M46 52 L13 62 C8 64, 7 72, 11 77 L44 74 L46 64Z"/>
      <path d="M54 52 L87 62 C92 64, 93 72, 89 77 L56 74 L54 64Z"/>
    </svg>
  );

  return (
    <div className="gm-root">

      {/* ── BOOT ── */}
      <div className={`gm-boot ${booted ? 'gm-boot--out' : ''}`}>
        <div className="gm-boot__flash" />
        <div className="gm-boot__sweep" />
        <div className="gm-boot__content">
          <div className="gm-boot__logo"><GoatLogo /></div>
          <div className="gm-boot__name">GOATMODE<span>.AI</span></div>
          <div className="gm-boot__tag">BUILT FOR HOW AI THINKS</div>
        </div>
      </div>

      {/* ── APP ── */}
      <div className={`gm-app ${booted ? 'gm-app--on' : ''}`}>

        {/* ════════════ INPUT SCREEN ════════════ */}
        {screen === 'input' && (
          <div className="gm-screen gm-input">

            {/* ── Profile Banner / Setup ── */}
            {!profile && !showProfileSetup && (
              <div className="gm-profile-banner">
                <span className="gm-profile-banner__label">
                  Personalize GoatMode — tell me once, get better prompts every time
                </span>
                <button
                  className="gm-profile-banner__btn"
                  onClick={() => { setProfileForm({ role: '', industry: '', tools: '', goals: '' }); setShowProfileSetup(true); }}
                >
                  Set up
                </button>
              </div>
            )}

            {profile && !showProfileSetup && (
              <div className="gm-profile-badge" onClick={handleProfileEdit}>
                <span>👤 {profile.role} · {profile.industry}</span>
                <span className="gm-profile-badge__edit">edit</span>
              </div>
            )}

            {showProfileSetup && (
              <div className="gm-profile-form">
                <div className="gm-profile-form__title">Personalize GoatMode</div>
                <div className="gm-profile-field">
                  <label>Your role</label>
                  <input
                    placeholder="e.g. Product Manager, Founder, Engineer"
                    value={profileForm.role}
                    onChange={e => setProfileForm(f => ({ ...f, role: e.target.value }))}
                  />
                </div>
                <div className="gm-profile-field">
                  <label>Industry</label>
                  <input
                    placeholder="e.g. SaaS, Healthcare, E-commerce"
                    value={profileForm.industry}
                    onChange={e => setProfileForm(f => ({ ...f, industry: e.target.value }))}
                  />
                </div>
                <div className="gm-profile-field">
                  <label>Tools you use</label>
                  <input
                    placeholder="e.g. Notion, Slack, Figma, Python"
                    value={profileForm.tools}
                    onChange={e => setProfileForm(f => ({ ...f, tools: e.target.value }))}
                  />
                </div>
                <div className="gm-profile-field">
                  <label>Core goal</label>
                  <input
                    placeholder="e.g. Launch a product, grow a team, close more deals"
                    value={profileForm.goals}
                    onChange={e => setProfileForm(f => ({ ...f, goals: e.target.value }))}
                  />
                </div>
                <div className="gm-profile-form__actions">
                  <button className="gm-profile-form__save" onClick={handleProfileSave}>Save</button>
                  <button className="gm-profile-form__dismiss" onClick={() => setShowProfileSetup(false)}>Dismiss</button>
                </div>
              </div>
            )}

            <div className="gm-input__hero">
              <div className="gm-input__logo-wrap">
                <GoatLogo w={48} h={56} />
              </div>
              <h1 className="gm-input__wordmark">GOATMODE<span>.AI</span></h1>
              <p className="gm-input__sub">Turn any rough idea into a prompt that actually works</p>
              <div className="gm-input__divider" />
            </div>

            {/* Build / Improve toggle */}
            <div className="gm-mode-toggle">
              <button
                className={`gm-mode-btn ${inputMode === 'build' ? 'gm-mode-btn--active' : ''}`}
                onClick={() => { setInputMode('build'); setRawInput(''); }}
              >
                ⚡ Build New
              </button>
              <button
                className={`gm-mode-btn ${inputMode === 'improve' ? 'gm-mode-btn--active' : ''}`}
                onClick={() => { setInputMode('improve'); setRawInput(''); }}
              >
                ↑ Improve Mine
              </button>
            </div>

            {/* Textarea */}
            <div className="gm-input__box">
              <textarea
                ref={textareaRef}
                className="gm-textarea"
                placeholder={inputMode === 'improve'
                  ? 'Paste your existing prompt here to make it 10× better...'
                  : 'What do you need to get done? Describe it like you\'d tell a smart colleague...'}
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleStart(); }}
                rows={inputMode === 'improve' ? 7 : 4}
                maxLength={inputMode === 'improve' ? 3000 : 1000}
              />
              <div className="gm-textarea__footer">
                {liveType && inputMode === 'build' ? (
                  <div className="gm-type-badge">
                    <span className="gm-type-badge__dot" />
                    <span>DETECTED: {(TYPE_LABELS[liveType] ?? liveType).toUpperCase()}</span>
                  </div>
                ) : <div />}
                <span className="gm-textarea__count">
                  {rawInput.length} / {inputMode === 'improve' ? '3000' : '1000'}
                </span>
              </div>
            </div>

            {/* CTA button */}
            <button
              className="gm-btn-primary"
              onClick={handleStart}
              disabled={rawInput.trim().length < 3}
            >
              <span className="gm-btn-primary__icon">{inputMode === 'improve' ? '↑' : '⚡'}</span>
              <span className="gm-btn-primary__label">
                {inputMode === 'improve' ? 'IMPROVE THIS PROMPT' : 'ENGINEER MASTER PROMPT'}
              </span>
              <span className="gm-btn-primary__hint">⌘↵</span>
            </button>

            {/* Example chips (build mode only) */}
            {inputMode === 'build' && (
              <div className="gm-examples">
                <div className="gm-examples__label">TRY AN EXAMPLE</div>
                <div className="gm-examples__grid">
                  {[
                    'Email my boss asking for a raise',
                    'Cold outreach to a potential client',
                    'Explain quantum computing simply',
                    'Write a 30-day content strategy',
                    'Analyze our Q3 performance data',
                    'Build a REST API in TypeScript',
                  ].map(ex => (
                    <button key={ex} className="gm-examples__chip"
                      onClick={() => { setRawInput(ex); setTimeout(() => textareaRef.current?.focus(), 50); }}>
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="gm-history">
                <div className="gm-history__label">RECENT</div>
                <div className="gm-history__list">
                  {history.map(h => (
                    <button key={h.id} className="gm-history__pill"
                      onClick={() => {
                        setPrompt(h.prompt); setDisplayed(h.prompt);
                        setRawInput(h.raw); setType(h.type);
                        setStreamDone(true); setPromptScore(calcScore(h.prompt));
                        setVariantA(''); setVariantB(''); setActiveVariant('orig');
                        setPreviewText(''); setShowPreviewState(false);
                        setScreen('output');
                      }}>
                      <span className="gm-history__pill-type">{TYPE_LABELS[h.type] ?? h.type}</span>
                      <span className="gm-history__pill-text">
                        {h.raw.length > 46 ? h.raw.slice(0, 46) + '…' : h.raw}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ CHAT SCREEN ════════════ */}
        {screen === 'chat' && (
          <div className="gm-screen gm-chat">
            <div className="gm-chat__topbar">
              <button className="gm-back" onClick={goHome}>← back</button>
              <div className="gm-chat__meta">
                <div className="gm-chat__origin">
                  {rawInput.length > 38 ? rawInput.slice(0, 38) + '…' : rawInput}
                </div>
                {qCount > 0 && (
                  <div className="gm-chat__progress">Q {qCount}</div>
                )}
              </div>
              <div className="gm-chat__topbar-actions">
                <button
                  className={`gm-paste-btn ${showPaste ? 'gm-paste-btn--active' : ''}`}
                  onClick={() => setShowPaste(v => !v)}
                  title="Paste reference material, URLs, or extra context"
                >
                  📎 context
                </button>
                <button className="gm-skip" onClick={handleSkip}>skip → build</button>
              </div>
            </div>

            {/* Paste context panel */}
            {showPaste && (
              <div className="gm-paste-panel">
                <div className="gm-paste-panel__label">
                  Paste reference material, a URL, example text, or any extra context you want included in your prompt:
                </div>
                <textarea
                  className="gm-paste-panel__textarea"
                  placeholder="Paste anything here — URLs, examples, competitor copy, data, background info..."
                  value={pasteCtx}
                  onChange={e => setPasteCtx(e.target.value)}
                  rows={4}
                />
                {pasteCtx.trim() && (
                  <div className="gm-paste-panel__done">
                    ✓ Context added — it will be woven into your prompt
                  </div>
                )}
              </div>
            )}

            <div className="gm-chat__messages">
              {bubbles.map(b => (
                <div key={b.id} className={`gm-bub gm-bub--${b.role}`}>
                  {b.role === 'ai' && <div className="gm-bub__avatar">GM</div>}
                  <div className="gm-bub__text">{b.text}</div>
                </div>
              ))}

              {/* Typing indicator */}
              {isGMTyping && (
                <div className="gm-bub gm-bub--ai">
                  <div className="gm-bub__avatar">GM</div>
                  <div className="gm-bub__text gm-typing-dots">
                    <span /><span /><span />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <div className="gm-chat__input-row">
              <input
                ref={chatInputRef}
                className="gm-chat__input"
                placeholder="Type your answer…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAnswer(chatInput); }}
              />
              <button className="gm-chat__send" onClick={() => handleAnswer(chatInput)}>→</button>
            </div>
          </div>
        )}

        {/* ════════════ THINKING SCREEN ════════════ */}
        {screen === 'thinking' && (
          <div className="gm-screen gm-thinking">
            <div className="gm-thinking__logo"><GoatLogo /></div>
            <div className="gm-thinking__line">
              {isCritiquing ? CRITIQUE_LINES[thinking % CRITIQUE_LINES.length] : THINKING_LINES[thinking % THINKING_LINES.length]}
            </div>
            <div className="gm-thinking__dots"><span /><span /><span /></div>
          </div>
        )}

        {/* ════════════ OUTPUT SCREEN ════════════ */}
        {screen === 'output' && (
          <div className="gm-screen gm-output">

            {/* Sticky topbar */}
            <div className="gm-output__topbar">
              <button className="gm-back" onClick={goHome}>← new prompt</button>
              <div className="gm-output__actions">
                <button
                  className={`gm-action-btn ${copied ? 'gm-action-btn--done' : ''}`}
                  onClick={handleCopy}
                  disabled={!streamDone}
                >{copied ? '✓ copied' : 'copy'}</button>
                <button className="gm-action-btn gm-action-btn--claude" onClick={openInClaude} disabled={!streamDone}>
                  open in claude ↗
                </button>
                <button className="gm-action-btn gm-action-btn--gpt" onClick={openInChatGPT} disabled={!streamDone}>
                  chatgpt ↗
                </button>
                {streamDone && !previewStreaming && (
                  <button
                    className="gm-preview-btn"
                    onClick={runPreview}
                  >
                    ▶ preview
                  </button>
                )}
              </div>
            </div>

            {/* Model Selector Row */}
            {streamDone && (
              <div className="gm-model-selector">
                <span className="gm-model-selector__label">TARGET MODEL</span>
                {(['claude', 'gpt4', 'gemini'] as TargetModel[]).map(m => (
                  <button
                    key={m}
                    className={`gm-model-chip ${targetModel === m ? 'gm-model-chip--active' : ''}`}
                    onClick={() => handleModelSwitch(m)}
                    disabled={targetModel === m}
                  >
                    {m === 'claude' ? 'CLAUDE' : m === 'gpt4' ? 'GPT-4O' : 'GEMINI'}
                  </button>
                ))}
              </div>
            )}

            {/* Score + meta row — reveals after streaming done */}
            {streamDone && promptScore > 0 && (
              <div className="gm-score-row">
                <div className="gm-score">
                  <span className="gm-score__ring" style={{ '--pct': `${(calcScore(activeText) / 10) * 100}%` } as React.CSSProperties} />
                  <span className="gm-score__num">{calcScore(activeText).toFixed(1)}</span>
                  <span className="gm-score__denom">/10</span>
                  <span className="gm-score__grade">EXPERT GRADE</span>
                </div>
                <div className="gm-output__meta">
                  <span>{wordCount} words</span>
                  <span className="gm-meta-sep">·</span>
                  <span>~{Math.round(wordCount * 1.3)} tokens</span>
                  <span className="gm-meta-sep">·</span>
                  <span className="gm-meta-type">{(TYPE_LABELS[currentType] ?? currentType).toUpperCase()}</span>
                </div>
              </div>
            )}

            {/* Prompt card */}
            <div className="gm-output__card">
              <div className="gm-output__card-header">
                <span className="gm-output__badge">GOATMODE</span>
                <span className="gm-output__badge-sub">
                  {isCritiquing ? 'REFINING...' : 'ENGINEERED PROMPT'}
                </span>
                {streamDone && <span className="gm-output__badge-refined">✦ AUTO-REFINED</span>}
                {!streamDone && <span className="gm-stream-dot" />}
              </div>
              <div className="gm-output__text">
                {activeVariant === 'orig'
                  ? (displayed || <span className="gm-output__waiting">Generating...</span>)
                  : (activeVariant === 'a' ? variantA : variantB)
                }
                {!streamDone && displayed && activeVariant === 'orig' && <span className="gm-cursor">▋</span>}
              </div>
            </div>

            {/* Everything below only reveals after stream is done */}
            {streamDone && (
              <>
                {/* Variant bar */}
                <div className="gm-variant-bar">
                  {!variantA && !variantB && !generatingVariants && (
                    <button
                      className="gm-variant-gen-btn"
                      onClick={generateVariants}
                    >
                      ✦ Generate Variants
                    </button>
                  )}
                  {generatingVariants && (
                    <span className="gm-variant-gen-btn gm-variant-gen-btn--loading">
                      Generating variants…
                    </span>
                  )}
                  {(variantA || variantB) && (
                    <div className="gm-variant-tabs">
                      <button
                        className={`gm-variant-tab ${activeVariant === 'orig' ? 'gm-variant-tab--active' : ''}`}
                        onClick={() => setActiveVariant('orig')}
                      >
                        ORIGINAL
                      </button>
                      {variantA && (
                        <button
                          className={`gm-variant-tab ${activeVariant === 'a' ? 'gm-variant-tab--active' : ''}`}
                          onClick={() => setActiveVariant('a')}
                        >
                          EXPANDED
                        </button>
                      )}
                      {variantB && (
                        <button
                          className={`gm-variant-tab ${activeVariant === 'b' ? 'gm-variant-tab--active' : ''}`}
                          onClick={() => setActiveVariant('b')}
                        >
                          TIGHTER
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Live Preview Panel */}
                {showPreview && (
                  <div className="gm-preview-panel">
                    <div className="gm-preview-header">
                      <span>─── LIVE OUTPUT PREVIEW ───────────────</span>
                      <button
                        className="gm-preview-header__close"
                        onClick={() => { setShowPreviewState(false); setPreviewText(''); }}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="gm-preview-text">
                      {previewText || <span className="gm-output__waiting">Starting preview…</span>}
                      {previewStreaming && previewText && <span className="gm-cursor">▋</span>}
                    </div>
                  </div>
                )}

                {/* Refinement */}
                <div className="gm-refine">
                  <div className="gm-refine__label">REFINE THIS PROMPT</div>
                  <div className="gm-refine__chips">
                    {REFINE_CHIPS.map(c => (
                      <button
                        key={c}
                        className={`gm-refine__chip ${refining ? 'gm-refine__chip--disabled' : ''}`}
                        onClick={() => handleRefine(c)}
                        disabled={refining}
                      >{c}</button>
                    ))}
                  </div>
                  <div className="gm-refine__row">
                    <input
                      className="gm-refine__input"
                      placeholder="Or describe your own refinement..."
                      value={refineVal}
                      onChange={e => setRefineVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRefine(refineVal); }}
                      disabled={refining}
                    />
                    <button className="gm-refine__send" onClick={() => handleRefine(refineVal)} disabled={refining}>
                      {refining ? '…' : '→'}
                    </button>
                  </div>
                </div>

                {/* Why it works */}
                <div className="gm-techniques">
                  <div className="gm-techniques__label">WHY THIS PROMPT WORKS</div>
                  {techniques.map((t, i) => (
                    <div
                      key={t.code}
                      className="gm-technique"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <div className="gm-technique__code">{t.code}</div>
                      <div className="gm-technique__desc">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
