'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/* ─── TYPES ─────────────────────────────────── */
type Screen    = 'input' | 'chat' | 'thinking' | 'output';
type BubRole   = 'ai' | 'user';
type InputMode = 'build' | 'improve';
interface Bub  { id: number; role: BubRole; text: string; opts?: string[]; }
interface Saved{ id: string; raw: string; prompt: string; type: string; ts: number; }
interface Q    { id: string; text: string; type: 'text' | 'opts'; opts?: string[]; }

/* ─── QUESTION BANK ─────────────────────────── */
const QUESTIONS: Record<string, Q[]> = {
  negotiation: [
    { id:'q0', type:'text', text:'What result did you deliver recently — give me one number.' },
    { id:'q1', type:'text', text:'What increase are you asking for?' },
  ],
  communication: [
    { id:'q0', type:'text', text:'What\'s the core thing you need to say?' },
    { id:'q1', type:'opts', opts:['A client','My boss','A colleague','My team'], text:'Who are you talking to?' },
  ],
  marketing: [
    { id:'q0', type:'text', text:'Who exactly are you reaching? One sentence.' },
    { id:'q1', type:'text', text:'What do you want them to do after reading?' },
  ],
  analysis: [
    { id:'q0', type:'text', text:'Who reads this and what decision must it support?' },
  ],
  strategy: [
    { id:'q0', type:'text', text:'What specific goal must this strategy achieve?' },
    { id:'q1', type:'text', text:'What\'s the single biggest obstacle right now?' },
  ],
  coding: [
    { id:'q0', type:'text', text:'Language, framework, or platform?' },
    { id:'q1', type:'text', text:'What\'s the hardest part — what should I not miss?' },
  ],
  writing: [
    { id:'q0', type:'text', text:'Who is this for — describe the reader in one sentence.' },
    { id:'q1', type:'text', text:'What do you want them to feel or do after reading?' },
  ],
  creative: [
    { id:'q0', type:'text', text:'Who is this creative work for — one sentence.' },
    { id:'q1', type:'opts', opts:['Bold & provocative','Warm & human','Minimal & precise','Playful & surprising'], text:'What\'s the creative direction?' },
  ],
  education: [
    { id:'q0', type:'text', text:'Who are you explaining this to? Describe their background.' },
  ],
  research: [
    { id:'q0', type:'text', text:'What decision will this research inform?' },
    { id:'q1', type:'opts', opts:['Executive summary','Deep academic dive','Competitive intel','Market landscape'], text:'What format do you need?' },
  ],
  email: [
    { id:'q0', type:'opts', opts:['A potential client','My manager','A colleague','A vendor'], text:'Who is this email to?' },
    { id:'q1', type:'text', text:'What\'s the single thing you need them to do?' },
  ],
};

const THINKING_LINES = [
  'Reading your intent...',
  'Choosing the right expert role...',
  'Engineering the constraints...',
  'Calibrating precision...',
  'Locking in output format...',
  'Final polish...',
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
  if (len > 400)  s += 0.4;
  if (len > 800)  s += 0.3;
  if (len > 1200) s += 0.2;
  if (prompt.includes('<role>'))            s += 0.3;
  if (prompt.includes('<constraints>'))     s += 0.2;
  if (prompt.includes('<output_format>'))   s += 0.2;
  if (prompt.includes('<quality_standard>')) s += 0.2;
  if (/\d+%/.test(prompt))                  s += 0.2;
  if (/\d+ years/.test(prompt))             s += 0.1;
  if ((prompt.match(/<[a-z_]+>/g) || []).length >= 4) s += 0.1;
  return Math.min(9.8, Math.max(7.8, +s.toFixed(1)));
}

/* ─── IMPROVE-MODE SYSTEM PROMPT ────────────── */
function buildImprovePrompt(): string {
  return `You are a world-class prompt engineer. The user has provided an existing prompt they want dramatically improved.

Make it 10× more effective:
1. Add a specific named expert role with credentials, years of experience, and a track record
2. Replace vague instructions with precise, measurable ones — every verb should have a concrete outcome
3. Add an explicit output format specification with labelled sections
4. Add a quality bar: what does "excellent" look like to the intended reader?
5. Add 5+ hard constraints — things explicitly NOT to do
6. Remove all filler, hedging, apologies, and platitudes
7. Structure with XML tags: <role>, <context>, <objective>, <task>, <constraints>, <output_format>, <quality_standard>

Output ONLY the improved prompt — no preamble, no explanation, no meta-commentary.`;
}

/* ─── META PROMPT ───────────────────────────── */
function buildMetaPrompt(): string {
  return `You are a world-class prompt engineer. Transform the user's rough idea into a master-level AI prompt.

Detect and infer: task type, ideal expert role, implied audience, output format, tone, constraints.

Always include:
1. Specific named expert role (specialty, years of experience, measurable track record)
2. Audience with psychographic detail
3. Step-by-step numbered task instructions (5–8 steps, each referencing the user's specific answers)
4. Exact output format specification
5. Quality bar — what "excellent" looks like in concrete, reader-specific terms
6. Constraints — 5+ things NOT to do
7. Reasoning instruction for complex tasks

Rules:
- Weave the user's EXACT WORDS from their answers into every section — no generic placeholders
- Write addressed to the AI ("You are...", "Your task is...")
- Output ONLY the enhanced prompt — no preamble, no explanation
- Format using XML tags: <role>, <context>, <objective>, <task>, <constraints>, <output_format>, <quality_standard>
- Keep each section tight: 1-4 lines max. Dense and precise.

Transform this into a master prompt:`;
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

function buildOfflinePrompt(raw: string, answers: Record<string,string>, type: string): string {
  const a = answers;
  const use = (v: string|undefined, fb: string) => v?.trim() ? v.trim() : fb;
  const role = getRole(type);

  const taskMap: Record<string, string> = {
    negotiation: `1. Subject: "Quick chat about my comp?" — not "Salary Discussion."\n  2. Open with: "${use(a.q0,'[your achievement]')}" — state it as fact.\n  3. The ask: ${use(a.q1,'[your target]')}. A number, not a range.\n  4. CTA: "15 minutes this week?" — then stop.\n  5. Under 150 words.`,
    communication: `1. Lead with: "${use(a.q0,'[core message]')}" — by paragraph 2 at the latest.\n  2. Recipient: ${use(a.q1,'[recipient]')} — calibrate every word.\n  3. Use SBI: Situation, Behaviour, Impact.\n  4. Close with one concrete next step.`,
    marketing: `1. Target: ${use(a.q0,'[your target]')} — every word for this person.\n  2. Hook: earn the next sentence in the first 8 words.\n  3. One CTA: ${use(a.q1,'[desired action]')}.\n  4. Write 3 subject line variants. Label each formula.`,
    analysis: `1. Audience: ${use(a.q0,'[audience and decision]')} — lead with what they need to decide.\n  2. State your conclusion first (Pyramid Principle).\n  3. End with 3–5 prioritised recommendations.`,
    strategy: `1. Goal: ${use(a.q0,'[specific goal]')} — diagnose the actual situation.\n  2. Binding constraint: ${use(a.q1,'[obstacle]')} — fix this first.\n  3. 30/60/90 day plan with owners and success metrics.`,
    coding: `1. Language: ${use(a.q0,'[language]')} — use its conventions throughout.\n  2. Hard part: ${use(a.q1,'[hard part]')} — address this first.\n  3. Error handling at every boundary. Usage example required.`,
    writing: `1. Reader: ${use(a.q0,'[reader description]')} — every decision for them.\n  2. Goal: ${use(a.q1,'[reader outcome]')} — reader feels this by the last line.\n  3. Opening: earn the next minute in the first sentence. Write it last.`,
    creative: `1. Audience: ${use(a.q0,'[audience]')} — what do they fear or desire?\n  2. Direction: ${use(a.q1,'[direction]')} — every idea filtered through this.\n  3. Apply the First Idea Veto: generate the obvious, discard it.`,
    education: `1. Learner: ${use(a.q0,'[learner background]')} — calibrate every analogy.\n  2. Lead with the single keystone concept.\n  3. Address 3 misconceptions before the learner hits them.`,
    research: `1. Decision: ${use(a.q0,'[decision]')} — every finding evaluated against this.\n  2. Format: ${use(a.q1,'[format]')} — structure determines usability.\n  3. Distinguish fact / inference / recommendation.`,
    email: `1. Recipient: ${use(a.q0,'[recipient]')} — calibrate tone and context entirely.\n  2. One ask: ${use(a.q1,'[ask]')} — state it in the first 3 sentences.\n  3. Under 100 words. Subject line must earn the open.`,
  };

  const task = taskMap[type] || taskMap.writing;
  const filled = Object.values(a).filter(v => v?.trim());

  return [
    '<role>',`  ${role}`,'</role>','',
    '<context>',
    `  Task: "${raw}"`,
    ...filled.map(v => `  — ${v}`),
    '</context>','',
    '<objective>',`  ${getObjective(type, raw)}`,'</objective>','',
    '<task>',`  ${task}`,'</task>','',
    '<constraints>',`  ${getConstraints(type)}`,'</constraints>','',
    '<output_format>',`  ${getFormat(type)}`,'</output_format>','',
    '<quality_standard>',`  ${getQuality(type)}`,'</quality_standard>',
  ].join('\n');
}

/* ─── STREAMING FETCH ───────────────────────── */
async function streamFetch(
  userContent: string,
  systemPrompt: string,
  onChunk: (full: string) => void
): Promise<string> {
  const res = await fetch('/api/transform', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userContent, systemPrompt, stream: true }),
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

function buildUserContent(raw: string, answers: Record<string,string>): string {
  let content = raw;
  const filled = Object.entries(answers).filter(([, v]) => v?.trim());
  if (filled.length > 0) {
    content += '\n\nContext from my answers:\n' + filled.map(([, v]) => `- ${v}`).join('\n');
  }
  return content;
}

/* ─── HISTORY ───────────────────────────────── */
const HIST_KEY = 'gm_hist_v3';
function loadHistory(): Saved[] {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch { return []; }
}
function saveToHistory(item: Saved) {
  try {
    const h = loadHistory().filter(x => x.id !== item.id);
    localStorage.setItem(HIST_KEY, JSON.stringify([item, ...h].slice(0, 8)));
  } catch {}
}

/* ─── COMPONENT ─────────────────────────────── */
let bubId = 0;

export default function GoatmodePage() {
  /* Core */
  const [screen, setScreen]           = useState<Screen>('input');
  const [rawInput, setRawInput]       = useState('');
  const [inputMode, setInputMode]     = useState<InputMode>('build');
  /* Chat */
  const [bubbles, setBubbles]         = useState<Bub[]>([]);
  const [qIdx, setQIdx]               = useState(0);
  const [answers, setAnswers]         = useState<Record<string,string>>({});
  const [chatInput, setChatInput]     = useState('');
  const [isGMTyping, setIsGMTyping]   = useState(false);
  const [currentType, setType]        = useState('writing');
  const [questions, setQs]            = useState<Q[]>([]);
  /* Output */
  const [prompt, setPrompt]           = useState('');
  const [displayed, setDisplayed]     = useState('');
  const [streamDone, setStreamDone]   = useState(false);
  const [promptScore, setPromptScore] = useState(0);
  /* Thinking */
  const [thinking, setThinking]       = useState(0);
  /* History */
  const [history, setHistory]         = useState<Saved[]>([]);
  /* Refine */
  const [refineVal, setRefineVal]     = useState('');
  const [refining, setRefining]       = useState(false);
  /* UI */
  const [copied, setCopied]           = useState(false);
  const [booted, setBooted]           = useState(false);

  const chatEndRef   = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
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
    const iv = setInterval(() => setThinking(n => (n + 1) % THINKING_LINES.length), 900);
    return () => clearInterval(iv);
  }, [screen]);

  /* ── CHAT HELPERS ── */
  const addBub = useCallback((role: BubRole, text: string, opts?: string[]) => {
    setBubbles(prev => [...prev, { id: ++bubId, role, text, opts }]);
  }, []);

  /* Show typing indicator, then deliver bubble */
  const askQuestion = useCallback((qs: Q[], idx: number) => {
    if (idx >= qs.length) return;
    setIsGMTyping(true);
    setTimeout(() => {
      setIsGMTyping(false);
      addBub('ai', qs[idx].text, qs[idx].opts);
    }, 650 + Math.random() * 350);
  }, [addBub]);

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

  /* ── RUN THE PROMPT ENGINE ── */
  const runEngine = useCallback(async (raw: string, ans: Record<string,string>, type: string, sysPrompt: string) => {
    setScreen('thinking');
    setThinking(0);
    setStreamDone(false);
    setDisplayed('');

    let outputStarted = false;
    let lastFull = '';

    try {
      const userContent = buildUserContent(raw, ans);
      const p = await streamFetch(userContent, sysPrompt, (full) => {
        lastFull = full;
        if (!outputStarted) { outputStarted = true; setScreen('output'); }
        setDisplayed(full);
        setPrompt(full);
      });
      finaliseOutput(p || lastFull, type, raw);
    } catch {
      /* Offline fallback */
      const fb = buildOfflinePrompt(raw, ans, type);
      finaliseOutput(fb, type, raw);
    }
  }, [finaliseOutput]);

  /* ── START FLOW ── */
  const handleStart = useCallback(async () => {
    const raw = rawInput.trim();
    if (!raw) return;
    const type = detectType(raw);
    setType(type);

    if (inputMode === 'improve') {
      await runEngine(raw, {}, type, buildImprovePrompt());
      return;
    }

    // Build mode — start conversation
    const qs = QUESTIONS[type] || QUESTIONS.writing;
    setQs(qs);
    setAnswers({});
    setQIdx(0);
    setBubbles([]);
    setStreamDone(false);
    setScreen('chat');

    setTimeout(() => {
      setIsGMTyping(true);
      setTimeout(() => {
        setIsGMTyping(false);
        addBub('ai', 'Got it. A few quick questions to make this exactly right.');
        askQuestion(qs, 0);
      }, 720);
    }, 280);
  }, [rawInput, inputMode, addBub, askQuestion, runEngine]);

  /* ── ANSWER QUESTION ── */
  const handleAnswer = useCallback(async (answer: string) => {
    if (!answer.trim()) return;
    addBub('user', answer);
    setChatInput('');
    const newAnswers = { ...answers, [questions[qIdx].id]: answer };
    setAnswers(newAnswers);
    const next = qIdx + 1;

    if (next < questions.length) {
      setQIdx(next);
      askQuestion(questions, next);
    } else {
      setIsGMTyping(true);
      setTimeout(() => {
        setIsGMTyping(false);
        addBub('ai', 'Perfect. Engineering your prompt now...');
        setTimeout(async () => {
          await runEngine(rawInput, newAnswers, currentType, buildMetaPrompt());
        }, 380);
      }, 480);
    }
  }, [answers, questions, qIdx, rawInput, currentType, addBub, askQuestion, runEngine]);

  /* ── SKIP ── */
  const handleSkip = useCallback(async () => {
    await runEngine(rawInput, answers, currentType, buildMetaPrompt());
  }, [rawInput, answers, currentType, runEngine]);

  /* ── OUTPUT ACTIONS ── */
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }, [prompt]);

  const openInClaude   = useCallback(() => {
    navigator.clipboard.writeText(prompt).then(() => window.open('https://claude.ai/new', '_blank'));
  }, [prompt]);

  const openInChatGPT  = useCallback(() => {
    navigator.clipboard.writeText(prompt).then(() => window.open('https://chatgpt.com/', '_blank'));
  }, [prompt]);

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
          userContent: `Refine this prompt per the instruction: "${instruction}"\n\nOriginal:\n${prompt}`,
          systemPrompt: 'You are a prompt engineer. Apply the instruction to refine the prompt. Keep the XML structure. Output ONLY the refined prompt — no explanation.',
        }),
      });
      const data = await res.json();
      if (data.text) {
        setPrompt(data.text);
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
  }, [prompt, refining]);

  const goHome = useCallback(() => {
    setScreen('input');
    setRawInput('');
    setBubbles([]);
    setAnswers({});
    setQIdx(0);
    setPrompt('');
    setDisplayed('');
    setStreamDone(false);
    setIsGMTyping(false);
    setInputMode('build');
  }, []);

  /* ── DERIVED ── */
  const currentQ  = questions[qIdx];
  const isOptQ    = currentQ?.type === 'opts';
  const liveType  = rawInput.length > 8 ? detectType(rawInput) : null;
  const techniques = TECHNIQUES[currentType] || TECHNIQUES.writing;
  const wordCount  = displayed.trim() ? displayed.trim().split(/\s+/).length : 0;

  /* ─── JSX ─────────────────────────────────── */
  const GoatLogo = ({ w = 52, h = 60 }: { w?: number; h?: number }) => (
    <svg width={w} height={h} viewBox="0 0 100 115" fill="white">
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
                {questions.length > 0 && (
                  <div className="gm-chat__progress">
                    Q {Math.min(qIdx + 1, questions.length)} OF {questions.length}
                  </div>
                )}
              </div>
              <button className="gm-skip" onClick={handleSkip}>skip → build</button>
            </div>

            <div className="gm-chat__messages">
              {bubbles.map(b => (
                <div key={b.id} className={`gm-bub gm-bub--${b.role}`}>
                  {b.role === 'ai' && <div className="gm-bub__avatar">GM</div>}
                  <div className="gm-bub__text">
                    {b.text}
                    {b.opts && (
                      <div className="gm-bub__opts">
                        {b.opts.map(o => (
                          <button key={o} className="gm-bub__opt" onClick={() => handleAnswer(o)}>{o}</button>
                        ))}
                      </div>
                    )}
                  </div>
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

            {!isOptQ && (
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
            )}
          </div>
        )}

        {/* ════════════ THINKING SCREEN ════════════ */}
        {screen === 'thinking' && (
          <div className="gm-screen gm-thinking">
            <div className="gm-thinking__logo"><GoatLogo /></div>
            <div className="gm-thinking__line">{THINKING_LINES[thinking]}</div>
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
              </div>
            </div>

            {/* Score + meta row — reveals after streaming done */}
            {streamDone && promptScore > 0 && (
              <div className="gm-score-row">
                <div className="gm-score">
                  <span className="gm-score__ring" style={{ '--pct': `${(promptScore / 10) * 100}%` } as React.CSSProperties} />
                  <span className="gm-score__num">{promptScore.toFixed(1)}</span>
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
                <span className="gm-output__badge-sub">ENGINEERED PROMPT</span>
                {!streamDone && <span className="gm-stream-dot" />}
              </div>
              <div className="gm-output__text">
                {displayed || <span className="gm-output__waiting">Generating...</span>}
                {!streamDone && displayed && <span className="gm-cursor">▋</span>}
              </div>
            </div>

            {/* Everything below only reveals after stream is done */}
            {streamDone && (
              <>
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
