'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/* ─── TYPES ────────────────────────────────── */
type Screen   = 'input' | 'chat' | 'thinking' | 'output';
type BubRole  = 'ai' | 'user';
interface Bub { id: number; role: BubRole; text: string; opts?: string[]; }
interface Saved { id: string; raw: string; prompt: string; type: string; ts: number; }
interface Q   { id: string; text: string; type: 'text' | 'opts'; opts?: string[]; }

/* ─── QUESTIONS (required only, max 2) ─────── */
const QUESTIONS: Record<string, Q[]> = {
  negotiation:  [
    { id:'q0', type:'text', text:'What result did you deliver recently — give me one number.' },
    { id:'q1', type:'text', text:'What increase are you asking for?' },
  ],
  communication:[
    { id:'q0', type:'text', text:'What\'s the core thing you need to say?' },
    { id:'q1', type:'opts', opts:['A client','My boss','A colleague','My team'], text:'Who are you talking to?' },
  ],
  marketing:    [
    { id:'q0', type:'text', text:'Who exactly are you reaching? One sentence.' },
    { id:'q1', type:'text', text:'What do you want them to do after reading?' },
  ],
  analysis:     [
    { id:'q0', type:'text', text:'Who reads this and what decision must it support?' },
  ],
  strategy:     [
    { id:'q0', type:'text', text:'What specific goal must this strategy achieve?' },
    { id:'q1', type:'text', text:'What\'s the single biggest obstacle right now?' },
  ],
  coding:       [
    { id:'q0', type:'text', text:'Language, framework, or platform?' },
  ],
  writing:      [
    { id:'q0', type:'text', text:'Who is this for — describe the reader in one sentence.' },
    { id:'q1', type:'text', text:'What do you want them to feel or do after reading?' },
  ],
  creative:     [
    { id:'q0', type:'text', text:'Who is this creative work for — one sentence.' },
  ],
  education:    [
    { id:'q0', type:'text', text:'Who are you explaining this to? Describe their background.' },
  ],
};

const THINKING_LINES = [
  'Reading your intent...',
  'Choosing the right expert role...',
  'Engineering the constraints...',
  'Calibrating precision...',
  'Final polish...',
];

const REFINE_CHIPS = ['Make it shorter','More direct','More formal','More aggressive','Simpler language'];

const TECHNIQUES: Record<string, {code:string;desc:string}[]> = {
  negotiation:[
    {code:'VALUE-FIRST ANCHORING',desc:'Opening with a specific measurable result shifts the frame from "wanting more" to "being paid accurately for what you produce."'},
    {code:'ASK SEPARATION',desc:'The email\'s only job is getting the meeting — not winning the raise. Collapsing both into one email is the most common reason salary requests fail.'},
    {code:'CONSTRAINT ARCHITECTURE',desc:'Banning "deserve," "just wanted to," and apology language removes the 6 most common phrases that signal low confidence.'},
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
    {code:'ROLE INJECTION',desc:'A principal-engineer identity means optimising for production readiness and edge cases — not just "working code."'},
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
};

/* ─── DETECT TYPE ───────────────────────────── */
function detectType(t: string): string {
  const l = t.toLowerCase();
  if (/\b(raise|salary|promotion|pay increase|compensation|negotiate)\b/.test(l)) return 'negotiation';
  if (/\b(difficult conversation|hard talk|confrontation|conflict|feedback to|performance issue|delay|bad news|explain to|status update)\b/.test(l)) return 'communication';
  if (/\b(code|build|develop|function|app|api|script|debug|refactor|implement)\b/.test(l)) return 'coding';
  if (/\b(market|campaign|ad|copy|brand|pitch|sales|cold email|outreach|convert)\b/.test(l)) return 'marketing';
  if (/\b(analyz|review|compar|evaluat|assess|research|audit|diagnos)\b/.test(l)) return 'analysis';
  if (/\b(plan|strateg|roadmap|framework|how to|steps to|guide to|system|scale)\b/.test(l)) return 'strategy';
  if (/\b(brainstorm|ideas|creative|concept|innovat|name|slogan|invent)\b/.test(l)) return 'creative';
  if (/\b(explain|teach|learn|understand|break down|simplif|what is|how does)\b/.test(l)) return 'education';
  return 'writing';
}

/* ─── PROMPT BUILDERS ───────────────────────── */
function buildMetaPrompt(): string {
  return `You are a world-class prompt engineer. Transform the user's rough idea into a master-level AI prompt.

Detect and infer: task type, ideal expert role, implied audience, output format, tone, constraints.

Always include:
1. Specific named expert role (specialty, years of experience, track record)
2. Audience with psychographic detail
3. Step-by-step numbered task instructions (5–8 steps, each referencing the user's specific answers)
4. Exact output format specification
5. Quality bar — what "excellent" looks like in concrete terms
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
  };
  return r[type] || r.writing;
}

function buildOfflinePrompt(raw: string, answers: Record<string,string>, type: string): string {
  const a = answers;
  const use = (v: string|undefined, fb: string) => v?.trim() ? v.trim() : fb;
  const role = getRole(type);

  const taskMap: Record<string, string> = {
    negotiation: `1. Subject: "Quick chat about my comp?" — not "Salary Discussion."\n  2. Open with: "${use(a.q0,'[your achievement]')}" — state it as fact.\n  3. One sentence connecting that result to the ask. No "I feel I deserve."\n  4. The ask: ${use(a.q1,'[your target]')}. A number, not a range.\n  5. CTA: "15 minutes this week?" — then stop.\n  6. Under 150 words. Every extra word reduces your chances.`,
    communication: `1. Lead with: "${use(a.q0,'[core message]')}" — by paragraph 2 at the latest.\n  2. Open with empathy. Do not bury the headline.\n  3. Recipient: ${use(a.q1,'[recipient]')} — calibrate every word to how they receive difficult news.\n  4. Use SBI: Situation, Behaviour, Impact.\n  5. Close with one concrete next step. Vague endings create anxiety.\n  6. Include the one phrase NOT to say that would derail this entirely.`,
    marketing: `1. Target: ${use(a.q0,'[your target]')} — every word written for this specific person.\n  2. Hook: earn the next sentence in the first 8 words. Rewrite it 3 times.\n  3. One CTA: ${use(a.q1,'[desired action]')}. No alternatives.\n  4. Specifics before claims, always.\n  5. Write 3 subject line variants. Label each formula.\n  6. Cut every word not moving the reader toward the CTA.`,
    analysis: `1. Audience: ${use(a.q0,'[audience and decision]')} — lead with what they need to decide.\n  2. State your conclusion first (Pyramid Principle).\n  3. Apply the "So what?" test to every data point.\n  4. Distinguish: fact / inference / recommendation — never blur.\n  5. End with 3–5 prioritised recommendations: action, owner, timeline, metric.`,
    strategy: `1. Goal: ${use(a.q0,'[specific goal]')} — diagnose the actual situation precisely.\n  2. Binding constraint: ${use(a.q1,'[obstacle]')} — fix this before anything else.\n  3. Guiding policy: one approach that directly addresses the constraint.\n  4. 30/60/90 day plan: what gets done, who owns it, what success looks like.\n  5. Risk register: top 2 risks, likelihood, impact, mitigation.`,
    coding: `1. Language/framework: ${use(a.q0,'[language]')} — use its conventions throughout.\n  2. State the core problem in one sentence before writing a line of code.\n  3. Modular functions — each does one thing. Name them like documentation.\n  4. Error handling at every boundary. Never silently swallow exceptions.\n  5. Usage example showing the primary use case.`,
    writing: `1. Reader: ${use(a.q0,'[reader description]')} — every decision optimised for them.\n  2. Goal: ${use(a.q1,'[reader outcome]')} — the reader should feel this by the last line.\n  3. Opening: earn the next minute in the first sentence. Write it last.\n  4. Cut the first draft by 20%.\n  5. Closing: emotional punctuation, not summary.`,
    creative: `1. Audience: ${use(a.q0,'[audience]')} — what do they deeply feel, fear, or want?\n  2. Apply the First Idea Veto: generate the obvious, then discard it.\n  3. Generate 3 distinct creative territories — not executions, strategic directions.\n  4. Each territory: one-sentence concept + two-line rationale.\n  5. Cut any territory a cautious competitor would also produce.`,
    education: `1. Learner: ${use(a.q0,'[learner background]')} — calibrate every analogy to their knowledge.\n  2. Keystone concept: the single idea without which nothing else makes sense. Lead with this.\n  3. Find an everyday analogy that makes the core concept immediately intuitive.\n  4. Address 3 common misconceptions by name before the learner hits them.\n  5. Sticky close: one sentence they can repeat tomorrow.`,
  };

  const task = taskMap[type] || taskMap.writing;
  const filled = Object.values(a).filter(v => v?.trim());

  return [
    '<role>',`  ${role}`,'</role>','',
    '<context>',
    `  Task: "${raw}"`,
    ...filled.map(v => `  — ${v}`),
    '</context>','',
    '<objective>',
    `  ${getObjective(type, raw)}`,
    '</objective>','',
    '<task>',`  ${task}`,'</task>','',
    '<constraints>',`  ${getConstraints(type)}`,'</constraints>','',
    '<output_format>',`  ${getFormat(type)}`,'</output_format>','',
    '<quality_standard>',`  ${getQuality(type)}`,'</quality_standard>',
  ].join('\n');
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
  };
  return o[type] || `A complete, expert-level response to: "${raw}". Professional bar. No filler.`;
}

function getConstraints(type: string): string {
  const c: Record<string,string> = {
    negotiation:'No: "deserve," "I just wanted to…," apologies, salary comparisons, ranges. 150-word maximum.',
    communication:'No: buried headlines, passive accountability, over-apologising, vague next steps, character judgements.',
    marketing:'No: "game-changer," "revolutionary," "seamless," passive voice, unsupported claims, weak CTAs.',
    analysis:'No: vague conclusions, unsupported assertions, buried recommendations, jargon without definition.',
    strategy:'No: generic frameworks, recommendations without owners, strategy-speak, treating every priority as top priority.',
    coding:'No: pseudocode, placeholder comments, generic variable names, silent exception swallowing, over-engineering.',
    writing:'No: "in conclusion," "it is important to note," passive voice when active works, summaries instead of resonance.',
    creative:'No: first ideas, work a cautious brand manager would love, executions without a concept.',
    education:'No: jargon without definition, skipped logical steps, condescension, "simply" / "obviously," no concrete takeaway.',
  };
  return c[type] || 'No filler, passive voice, or vague language. Precise and direct.';
}

function getFormat(type: string): string {
  const f: Record<string,string> = {
    negotiation:'(a) Subject line + rationale. (b) Complete email, zero placeholders, under 150 words. (c) What to do if no reply in 5 days.',
    communication:'(a) Core message in one sentence. (b) Complete message or script, ready to use. (c) The one phrase NOT to say.',
    marketing:'(a) 3 subject/headline options — label the formula. (b) Full copy: hook, body, CTA. (c) Key strategic choice made.',
    analysis:'(a) Executive Summary — 3 bullets max. (b) Structured analysis, MECE. (c) Recommendations: Action | Owner | Timeline | Metric.',
    strategy:'(a) Diagnosis. (b) Binding constraint. (c) Top 3 priorities ranked. (d) 30/60/90-day plan. (e) Risk register.',
    coding:'(a) Architecture note in 2-3 lines. (b) Full implementation with comments. (c) Usage example. (d) Edge cases.',
    writing:'Complete piece: commanding opening, developed middle, resonant close. Include a suggested headline.',
    creative:'(a) 3 territories — named, concept, rationale. (b) Recommended direction with sketch. (c) Why this, not the others.',
    education:'(a) Keystone concept. (b) The analogy. (c) Layered explanation. (d) 3 misconceptions addressed. (e) Sticky summary.',
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
  };
  return q[type] || 'Precise, structured, every sentence earning its place.';
}

async function fetchTransform(raw: string, answers: Record<string,string>): Promise<string> {
  let userContent = raw;
  const filled = Object.entries(answers).filter(([,v]) => v?.trim());
  if (filled.length > 0) {
    userContent += '\n\nContext from my answers:\n' + filled.map(([,v]) => `- ${v}`).join('\n');
  }
  const res = await fetch('/api/transform', {
    method:'POST',
    headers:{'content-type':'application/json'},
    body: JSON.stringify({ userContent, systemPrompt: buildMetaPrompt() }),
  });
  if (!res.ok) throw new Error('API ' + res.status);
  const data = await res.json();
  return data.text;
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
  const [screen, setScreen]       = useState<Screen>('input');
  const [rawInput, setRawInput]   = useState('');
  const [bubbles, setBubbles]     = useState<Bub[]>([]);
  const [qIdx, setQIdx]           = useState(0);
  const [answers, setAnswers]     = useState<Record<string,string>>({});
  const [chatInput, setChatInput] = useState('');
  const [currentType, setType]    = useState('writing');
  const [questions, setQs]        = useState<Q[]>([]);
  const [prompt, setPrompt]       = useState('');
  const [displayed, setDisplayed] = useState('');
  const [thinking, setThinking]   = useState(0);
  const [history, setHistory]     = useState<Saved[]>([]);
  const [refineVal, setRefineVal] = useState('');
  const [refining, setRefining]   = useState(false);
  const [copied, setCopied]       = useState(false);
  const [booted, setBooted]       = useState(false);
  const chatEndRef  = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
    const t = setTimeout(() => setBooted(true), 2700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [bubbles]);

  useEffect(() => {
    if (screen === 'chat') setTimeout(() => chatInputRef.current?.focus(), 100);
    if (screen === 'input') setTimeout(() => textareaRef.current?.focus(), 100);
  }, [screen]);

  // Thinking text cycle
  useEffect(() => {
    if (screen !== 'thinking') return;
    const iv = setInterval(() => setThinking(n => (n + 1) % THINKING_LINES.length), 900);
    return () => clearInterval(iv);
  }, [screen]);

  /* ── CHAT HELPERS ── */
  const addBub = useCallback((role: BubRole, text: string, opts?: string[]) => {
    const b: Bub = { id: ++bubId, role, text, opts };
    setBubbles(prev => [...prev, b]);
    return b;
  }, []);

  const askQuestion = useCallback((qs: Q[], idx: number) => {
    if (idx >= qs.length) return false;
    setTimeout(() => addBub('ai', qs[idx].text, qs[idx].opts), 420);
    return true;
  }, [addBub]);

  /* ── START FLOW ── */
  const handleStart = useCallback(() => {
    const raw = rawInput.trim();
    if (!raw) return;
    const type = detectType(raw);
    const qs   = QUESTIONS[type] || QUESTIONS.writing;
    setType(type);
    setQs(qs);
    setAnswers({});
    setQIdx(0);
    setBubbles([]);
    setScreen('chat');
    // First AI bubble: echo + first question
    setTimeout(() => {
      addBub('ai', `Got it. A few quick questions to make this exactly right.`);
      askQuestion(qs, 0);
    }, 300);
  }, [rawInput, addBub, askQuestion]);

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
      // Done — build prompt
      setTimeout(() => addBub('ai', 'Perfect. Engineering your prompt now...'), 350);
      setTimeout(async () => {
        setScreen('thinking');
        setThinking(0);
        try {
          const p = await fetchTransform(rawInput, newAnswers);
          await showOutput(p, newAnswers, detectType(rawInput));
        } catch {
          const p = buildOfflinePrompt(rawInput, newAnswers, currentType);
          await showOutput(p, newAnswers, currentType);
        }
      }, 1400);
    }
  }, [answers, questions, qIdx, rawInput, currentType, addBub, askQuestion]);

  /* ── SKIP QUESTIONS ── */
  const handleSkip = useCallback(async () => {
    setScreen('thinking');
    setThinking(0);
    try {
      const p = await fetchTransform(rawInput, answers);
      await showOutput(p, answers, currentType);
    } catch {
      const p = buildOfflinePrompt(rawInput, answers, currentType);
      await showOutput(p, answers, currentType);
    }
  }, [rawInput, answers, currentType]);

  /* ── SHOW OUTPUT ── */
  const showOutput = useCallback(async (p: string, ans: Record<string,string>, type: string) => {
    setPrompt(p);
    setDisplayed('');
    setScreen('output');
    // Save to history
    const item: Saved = { id: Date.now().toString(), raw: rawInput, prompt: p, type, ts: Date.now() };
    saveToHistory(item);
    setHistory(loadHistory());
    // Stream text
    let i = 0;
    const tick = () => {
      if (i >= p.length) return;
      const chunk = Math.min(18, p.length - i);
      setDisplayed(p.slice(0, i + chunk));
      i += chunk;
      setTimeout(tick, 22);
    };
    setTimeout(tick, 120);
  }, [rawInput]);

  /* ── OUTPUT ACTIONS ── */
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [prompt]);

  const openInClaude = useCallback(() => {
    navigator.clipboard.writeText(prompt).then(() => {
      window.open('https://claude.ai/new', '_blank');
    });
  }, [prompt]);

  const openInChatGPT = useCallback(() => {
    navigator.clipboard.writeText(prompt).then(() => {
      window.open('https://chatgpt.com/', '_blank');
    });
  }, [prompt]);

  const handleRefine = useCallback(async (instruction: string) => {
    if (!instruction.trim() || refining) return;
    setRefining(true);
    setRefineVal('');
    try {
      const res = await fetch('/api/transform', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body: JSON.stringify({
          userContent: `Refine this prompt: ${instruction}\n\nOriginal prompt:\n${prompt}`,
          systemPrompt: 'You are a prompt engineer. Refine the given prompt according to the instruction. Keep the XML structure. Output ONLY the refined prompt, no explanation.',
        }),
      });
      const data = await res.json();
      if (data.text) {
        setPrompt(data.text);
        setDisplayed('');
        let i = 0;
        const tick = () => {
          if (i >= data.text.length) return;
          const chunk = Math.min(18, data.text.length - i);
          setDisplayed(data.text.slice(0, i + chunk));
          i += chunk;
          setTimeout(tick, 22);
        };
        setTimeout(tick, 80);
      }
    } catch {}
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
  }, []);

  const currentQ = questions[qIdx];
  const isOptQ   = currentQ?.type === 'opts';

  /* ─── JSX ─────────────────────────────────── */
  return (
    <div className="gm-root">

      {/* ── BOOT ── */}
      <div className={`gm-boot ${booted ? 'gm-boot--out' : ''}`}>
        <div className="gm-boot__flash" />
        <div className="gm-boot__sweep" />
        <div className="gm-boot__content">
          <svg className="gm-boot__logo" width="52" height="60" viewBox="0 0 100 115" fill="white">
            <path d="M50 4 C51 12 51.8 26 52 42 C52.2 58 51.8 76 51.2 90 C50.8 102 50 113 50 114 C49.2 102 49 90 48.8 76 C48.2 58 47.8 42 48 26 C48.2 12 49 4 50 4Z"/>
            <path d="M45 12 C28 7, 7 20, 5 40 C3 56, 10 70, 22 76 L30 70 C20 64, 14 52, 15 38 C16 24, 28 15, 45 12Z"/>
            <path d="M55 12 C72 7, 93 20, 95 40 C97 56, 90 70, 78 76 L70 70 C80 64, 86 52, 85 38 C84 24, 72 15, 55 12Z"/>
            <path d="M46 52 L13 62 C8 64, 7 72, 11 77 L44 74 L46 64Z"/>
            <path d="M54 52 L87 62 C92 64, 93 72, 89 77 L56 74 L54 64Z"/>
          </svg>
          <div className="gm-boot__name">GOATMODE<span>.AI</span></div>
          <div className="gm-boot__tag">BUILT FOR HOW AI THINKS</div>
        </div>
      </div>

      {/* ── APP ── */}
      <div className={`gm-app ${booted ? 'gm-app--on' : ''}`}>

        {/* INPUT SCREEN */}
        {screen === 'input' && (
          <div className="gm-screen gm-input">
            <div className="gm-input__hero">
              <svg width="36" height="42" viewBox="0 0 100 115" fill="white" opacity="0.9">
                <path d="M50 4 C51 12 51.8 26 52 42 C52.2 58 51.8 76 51.2 90 C50.8 102 50 113 50 114 C49.2 102 49 90 48.8 76 C48.2 58 47.8 42 48 26 C48.2 12 49 4 50 4Z"/>
                <path d="M45 12 C28 7, 7 20, 5 40 C3 56, 10 70, 22 76 L30 70 C20 64, 14 52, 15 38 C16 24, 28 15, 45 12Z"/>
                <path d="M55 12 C72 7, 93 20, 95 40 C97 56, 90 70, 78 76 L70 70 C80 64, 86 52, 85 38 C84 24, 72 15, 55 12Z"/>
                <path d="M46 52 L13 62 C8 64, 7 72, 11 77 L44 74 L46 64Z"/>
                <path d="M54 52 L87 62 C92 64, 93 72, 89 77 L56 74 L54 64Z"/>
              </svg>
              <h1 className="gm-input__wordmark">GOATMODE<span>.AI</span></h1>
              <p className="gm-input__sub">Your rough idea → a prompt that actually gets results</p>
            </div>

            <div className="gm-input__box">
              <textarea
                ref={textareaRef}
                className="gm-textarea"
                placeholder="What do you need to get done? Just talk to me..."
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleStart(); }}
                rows={4}
                maxLength={1000}
              />
              <div className="gm-textarea__count">{rawInput.length} / 1000</div>
            </div>

            <button
              className="gm-btn-primary"
              onClick={handleStart}
              disabled={rawInput.trim().length < 3}
            >
              ⚡ ENGINEER MASTER PROMPT
            </button>

            {history.length > 0 && (
              <div className="gm-history">
                <div className="gm-history__label">RECENT</div>
                <div className="gm-history__list">
                  {history.map(h => (
                    <button key={h.id} className="gm-history__pill"
                      onClick={() => { setPrompt(h.prompt); setDisplayed(h.prompt); setRawInput(h.raw); setType(h.type); setScreen('output'); }}>
                      {h.raw.length > 42 ? h.raw.slice(0, 42) + '…' : h.raw}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CHAT SCREEN */}
        {screen === 'chat' && (
          <div className="gm-screen gm-chat">
            <div className="gm-chat__topbar">
              <button className="gm-back" onClick={goHome}>← back</button>
              <div className="gm-chat__origin">{rawInput.length > 48 ? rawInput.slice(0,48)+'…' : rawInput}</div>
              <button className="gm-skip" onClick={handleSkip}>skip → build now</button>
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
                          <button key={o} className="gm-bub__opt"
                            onClick={() => handleAnswer(o)}>
                            {o}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
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

        {/* THINKING SCREEN */}
        {screen === 'thinking' && (
          <div className="gm-screen gm-thinking">
            <svg className="gm-thinking__logo" width="52" height="60" viewBox="0 0 100 115" fill="white">
              <path d="M50 4 C51 12 51.8 26 52 42 C52.2 58 51.8 76 51.2 90 C50.8 102 50 113 50 114 C49.2 102 49 90 48.8 76 C48.2 58 47.8 42 48 26 C48.2 12 49 4 50 4Z"/>
              <path d="M45 12 C28 7, 7 20, 5 40 C3 56, 10 70, 22 76 L30 70 C20 64, 14 52, 15 38 C16 24, 28 15, 45 12Z"/>
              <path d="M55 12 C72 7, 93 20, 95 40 C97 56, 90 70, 78 76 L70 70 C80 64, 86 52, 85 38 C84 24, 72 15, 55 12Z"/>
              <path d="M46 52 L13 62 C8 64, 7 72, 11 77 L44 74 L46 64Z"/>
              <path d="M54 52 L87 62 C92 64, 93 72, 89 77 L56 74 L54 64Z"/>
            </svg>
            <div className="gm-thinking__line">{THINKING_LINES[thinking]}</div>
            <div className="gm-thinking__dots"><span/><span/><span/></div>
          </div>
        )}

        {/* OUTPUT SCREEN */}
        {screen === 'output' && (
          <div className="gm-screen gm-output">
            <div className="gm-output__topbar">
              <button className="gm-back" onClick={goHome}>← new prompt</button>
              <div className="gm-output__actions">
                <button className={`gm-action-btn ${copied ? 'gm-action-btn--done' : ''}`} onClick={handleCopy}>
                  {copied ? '✓ copied' : 'copy'}
                </button>
                <button className="gm-action-btn gm-action-btn--claude" onClick={openInClaude}>
                  open in claude ↗
                </button>
                <button className="gm-action-btn gm-action-btn--gpt" onClick={openInChatGPT}>
                  open in chatgpt ↗
                </button>
              </div>
            </div>

            <div className="gm-output__card">
              <div className="gm-output__card-head">
                <span className="gm-badge">GOATMODE</span>
                <span className="gm-badge-label">ENGINEERED PROMPT</span>
              </div>
              <div className="gm-output__text" id="output-text">
                {displayed}
                {displayed.length < prompt.length && <span className="gm-cursor" />}
              </div>
            </div>

            {/* REFINE */}
            <div className="gm-refine">
              <div className="gm-refine__label">REFINE THIS PROMPT</div>
              <div className="gm-refine__chips">
                {REFINE_CHIPS.map(c => (
                  <button key={c} className="gm-refine__chip" disabled={refining}
                    onClick={() => handleRefine(c)}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="gm-refine__input-row">
                <input
                  className="gm-refine__input"
                  placeholder="Or describe your own refinement…"
                  value={refineVal}
                  onChange={e => setRefineVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRefine(refineVal); }}
                  disabled={refining}
                />
                <button className="gm-refine__send" disabled={refining}
                  onClick={() => handleRefine(refineVal)}>
                  {refining ? '…' : '→'}
                </button>
              </div>
            </div>

            {/* TECHNIQUES */}
            <div className="gm-techs">
              <div className="gm-techs__label">WHY THIS PROMPT WORKS</div>
              <div className="gm-techs__grid">
                {(TECHNIQUES[currentType] || TECHNIQUES.writing).map(t => (
                  <div key={t.code} className="gm-tech">
                    <div className="gm-tech__code">{t.code}</div>
                    <div className="gm-tech__desc">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
