'use client';

import { useEffect } from 'react';

export default function GoatmodePage() {
  useEffect(() => {
    /* ═══ STATE ══════════════════════════════════════════ */
    let currentRaw = '';
    let currentType = 'writing';
    let currentAnswers: any = {};

    function showState(id: string) {
      document.querySelectorAll('.state').forEach((s: any) => s.classList.remove('active'));
      const el = document.getElementById(id);
      if (el) el.classList.add('active');
      document.body.classList.toggle('in-output', id === 'state-output');
    }

    function goBack() {
      showState('state-input');
      const ts = document.getElementById('technique-section');
      if (ts) ts.classList.remove('visible');
      setTimeout(() => {
        const ri = document.getElementById('raw-input');
        if (ri) ri.focus();
      }, 80);
    }

    /* ═══ INPUT ══════════════════════════════════════════ */
    let demoRunning = false;
    let demoTyping = false;
    let demoInterrupted = false;
    let demoRestartTimer: any = null;
    let isDemoMode = false;

    function onInput(el: HTMLTextAreaElement) {
      if (!demoTyping && demoRunning) { demoInterrupted = true; }
      if (!demoTyping && demoRestartTimer) { clearTimeout(demoRestartTimer); demoRestartTimer = null; }
      const len = el.value.length;
      const cc = document.getElementById('char-count');
      if (cc) cc.textContent = `${len} / 1000`;
      if (len > 1000) el.value = el.value.slice(0, 1000);
      const tb = document.getElementById('transform-btn') as HTMLButtonElement;
      if (tb) tb.disabled = el.value.trim().length < 4;
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) startTransform();
    }

    function useExample(btn: HTMLButtonElement) {
      const ta = document.getElementById('raw-input') as HTMLTextAreaElement;
      if (!ta) return;
      ta.value = btn.textContent?.trim() || '';
      ta.dispatchEvent(new Event('input'));
      ta.focus();
    }

    function selectOpt(btn: HTMLButtonElement) {
      const idx = btn.dataset.idx;
      const optsContainer = btn.closest('.q-opts');
      if (optsContainer) {
        optsContainer.querySelectorAll('.q-opt').forEach((o: any) => o.classList.remove('selected'));
      }
      btn.classList.add('selected');
      checkQAnswers();
    }

    /* ═══ AUTO-DEMO ══════════════════════════════════════ */
    const DEMO_TEXT = 'Email my boss asking for a raise';

    const DEMO_ANS = {
      q0: 'Shipped the new pricing dashboard 3 weeks early — renewals jumped 18%',
      q1: '18% salary increase',
      q2: '14 months',
      q3_oi: 1,
    };

    const DEMO_OUTPUT = `<role>
  You are a career strategist and former HR Director with 22 years of high-stakes compensation negotiations. You have coached 400+ professionals to an average 23% raise.
</role>

<context>
  Task: salary raise email. 14 months in role. Manager is casual and direct — mirror that exactly.
  Achievement to anchor on: "Shipped the new pricing dashboard 3 weeks early — renewals jumped 18%."
  Ask: 18% salary increase. This email may be forwarded to HR. Every sentence must survive that.
</context>

<objective>
  One send-ready email, under 150 words. Its only job: get the meeting. Not win the raise.
</objective>

<task>
  1. Subject: "Quick chat about my comp?" — not "Salary Discussion."
  2. First line: state the achievement as fact. "The new pricing dashboard shipped 3 weeks early. Renewals are up 18%."
  3. One sentence connecting that result to the ask. No "I feel I deserve."
  4. The number: 18% increase. Never a range.
  5. CTA: "15 minutes this week?" — then stop. Nothing after the CTA.
  6. Under 150 words. Every extra word reduces your chances.
  7. Casual, direct tone throughout. This manager communicates that way — match it.
</task>

<constraints>
  No: "deserve," "I just wanted to...," apologies, salary comparisons, ranges, filler.
  150-word maximum. Match the manager's casual, direct tone exactly.
</constraints>

<output_format>
  (a) Subject line + one-line rationale. (b) Complete email, zero placeholders, under 150 words. (c) What to do if no reply in 5 days.
</output_format>

<quality_standard>
  A direct manager reads this and thinks: "Short, specific, confident. I can work with this." The pricing dashboard result is the first thing they read. The number is clear.
</quality_standard>`;

    async function startDemo() {
      if (demoRunning) return;
      demoRunning = true;
      demoInterrupted = false;

      const ta = document.getElementById('raw-input') as HTMLTextAreaElement;
      const btn = document.getElementById('transform-btn') as HTMLButtonElement;
      if (!ta || !btn) return;

      await delay(700);

      ta.classList.add('demo-active');
      demoTyping = true;
      for (let i = 0; i <= DEMO_TEXT.length; i++) {
        if (demoInterrupted) { demoTyping = false; ta.classList.remove('demo-active'); demoRunning = false; return; }
        ta.value = DEMO_TEXT.slice(0, i);
        ta.dispatchEvent(new Event('input'));
        await delay(48 + Math.random() * 28);
      }
      demoTyping = false;
      ta.classList.remove('demo-active');

      await delay(820);

      btn.style.background = 'rgba(255,255,255,0.82)';
      await delay(130); btn.style.background = ''; await delay(90);

      isDemoMode = true;
      startTransform();
    }

    async function showQuestionsAndAutoFill() {
      const qEcho = document.getElementById('q-echo');
      if (qEcho) qEcho.textContent = DEMO_TEXT;
      renderQuestions(generateQuestions('negotiation'));
      showState('state-questions');
      await delay(900);

      const q0 = document.getElementById('qinput-q0') as HTMLInputElement;
      if (q0) {
        demoTyping = true;
        for (let i = 0; i <= DEMO_ANS.q0.length; i++) {
          q0.value = DEMO_ANS.q0.slice(0, i);
          q0.dispatchEvent(new Event('input'));
          await delay(20 + Math.random() * 14);
        }
        demoTyping = false;
      }
      await delay(380);

      const q1 = document.getElementById('qinput-q1') as HTMLInputElement;
      if (q1) {
        demoTyping = true;
        for (let i = 0; i <= DEMO_ANS.q1.length; i++) {
          q1.value = DEMO_ANS.q1.slice(0, i);
          q1.dispatchEvent(new Event('input'));
          await delay(26 + Math.random() * 16);
        }
        demoTyping = false;
      }
      await delay(380);

      const q2 = document.getElementById('qinput-q2') as HTMLInputElement;
      if (q2) {
        demoTyping = true;
        for (let i = 0; i <= DEMO_ANS.q2.length; i++) {
          q2.value = DEMO_ANS.q2.slice(0, i);
          q2.dispatchEvent(new Event('input'));
          await delay(30 + Math.random() * 18);
        }
        demoTyping = false;
      }
      await delay(380);

      const opts = document.querySelectorAll('[data-qid="q3"] .q-opt') as any;
      if (opts[DEMO_ANS.q3_oi]) { opts[DEMO_ANS.q3_oi].click(); }
      await delay(700);

      const buildBtn = document.getElementById('build-btn') as HTMLButtonElement;
      if (buildBtn) {
        buildBtn.style.background = 'rgba(255,255,255,0.82)';
        await delay(140); buildBtn.style.background = ''; await delay(100);
      }

      buildDemoFinalPrompt();
    }

    async function buildDemoFinalPrompt() {
      currentAnswers = { q0: DEMO_ANS.q0, q1: DEMO_ANS.q1, q2: DEMO_ANS.q2, q3: 'Casual and direct' };
      const oiText = document.getElementById('oi-text');
      if (oiText) oiText.textContent = DEMO_TEXT;
      setPhaseLabels('PROCESSING YOUR ANSWERS', 'ENGINEERING YOUR PROMPT', 'CALIBRATING PRECISION');
      showState('state-thinking');
      resetPhases();

      await delay(350); activatePhase(1);
      await delay(920); donePhase(1); activatePhase(2);
      await delay(920); donePhase(2); activatePhase(3);
      await delay(680); donePhase(3);
      await delay(240);

      prepareOutput(DEMO_OUTPUT);
      showState('state-output');
      await delay(80);
      await streamOutput(DEMO_OUTPUT);
      showTechniques('negotiation');

      isDemoMode = false;
      await delay(2400);
      showDemoReset();
    }

    async function showDemoReset() {
      const cta = document.getElementById('demo-cta');
      if (cta) cta.classList.add('show');
      await delay(1800);
      if (cta) cta.classList.remove('show');
      await delay(450);

      goBack();
      await delay(200);
      const ta = document.getElementById('raw-input') as HTMLTextAreaElement;
      if (ta) {
        ta.value = '';
        ta.dispatchEvent(new Event('input'));
        ta.focus();
      }
      demoRunning = false;

      demoRestartTimer = setTimeout(() => {
        const rawInput = document.getElementById('raw-input') as HTMLTextAreaElement;
        if (rawInput && !rawInput.value.trim() && !demoRunning) {
          startDemo();
        }
      }, 4200);
    }

    /* ═══ PHASE LABELS ═══════════════════════════════════ */
    function setPhaseLabels(p1: string, p2: string, p3: string | null) {
      const ph1text = document.querySelector('#ph-1 .phase-text');
      const ph2text = document.querySelector('#ph-2 .phase-text');
      if (ph1text) ph1text.textContent = p1;
      if (ph2text) ph2text.textContent = p2;
      const ph3 = document.getElementById('ph-3');
      if (ph3) {
        if (p3) {
          ph3.style.display = '';
          const ph3text = document.querySelector('#ph-3 .phase-text');
          if (ph3text) ph3text.textContent = p3;
        } else {
          ph3.style.display = 'none';
        }
      }
    }

    /* ═══ TRANSFORM — STEP 1: analyze → show questions ══ */
    async function startTransform() {
      const rawInput = document.getElementById('raw-input') as HTMLTextAreaElement;
      if (!rawInput) return;
      const raw = rawInput.value.trim();
      if (!raw) return;
      currentRaw = raw;
      currentType = detectType(raw);
      const ts = document.getElementById('technique-section');
      if (ts) ts.classList.remove('visible');

      setPhaseLabels('ANALYZING YOUR REQUEST', 'GENERATING QUESTIONS', null);
      showState('state-thinking');
      resetPhases();

      await delay(320); activatePhase(1);
      await delay(820); donePhase(1); activatePhase(2);
      await delay(700); donePhase(2);
      await delay(220);

      const qEcho = document.getElementById('q-echo');
      if (qEcho) qEcho.textContent = raw;
      renderQuestions(generateQuestions(currentType));
      showState('state-questions');
    }

    /* ═══ TRANSFORM — STEP 2: answers → build prompt ═══ */
    async function buildFinalPrompt() {
      const answers = collectAnswers();
      currentAnswers = answers;
      const oiText = document.getElementById('oi-text');
      if (oiText) oiText.textContent = currentRaw;

      setPhaseLabels('PROCESSING YOUR ANSWERS', 'ENGINEERING YOUR PROMPT', 'CALIBRATING PRECISION');
      showState('state-thinking');
      resetPhases();

      await delay(350); activatePhase(1);
      await delay(920); donePhase(1); activatePhase(2);
      await delay(920); donePhase(2); activatePhase(3);
      await delay(680); donePhase(3);
      await delay(240);

      let masterPrompt: string;
      try {
        masterPrompt = await fetchClaudeTransform(currentRaw, answers);
      } catch(e) {
        masterPrompt = buildOfflinePrompt(currentRaw, answers);
      }

      prepareOutput(masterPrompt);
      showState('state-output');
      await delay(80);
      await streamOutput(masterPrompt);
      showTechniques(currentType);
    }

    /* ═══ QUESTIONS ENGINE ═══════════════════════════════ */
    const QUESTIONS: any = {
      negotiation:[
        { id:'q0', label:'What specific result did you deliver recently? Numbers make this.', type:'text', ph:'e.g. Shipped the pricing dashboard 3 weeks early — renewals up 18%', req:true },
        { id:'q1', label:'What number are you targeting?', type:'text', ph:'e.g. 18% increase, or $15k more per year', req:true },
        { id:'q2', label:'How long have you been in this role?', type:'text', ph:'e.g. 14 months', req:false },
        { id:'q3', label:"What's your relationship with your manager like?", type:'opts', opts:['Formal and professional','Casual and direct','Somewhere in between'], req:false }
      ],
      communication:[
        { id:'q0', label:'What is the core thing you need to say?', type:'text', ph:'e.g. The project will be 3 weeks late due to a vendor delay', req:true },
        { id:'q1', label:'Who are you talking to?', type:'opts', opts:['A client','My boss','A colleague','My team'], req:true },
        { id:'q2', label:'Written message or a live conversation?', type:'opts', opts:['Email or written message','In-person or on a call'], req:false },
        { id:'q3', label:'What do you need them to do or feel after?', type:'text', ph:'e.g. Approve a 3-week extension without losing trust in us', req:false }
      ],
      marketing:[
        { id:'q0', label:'Who exactly are you reaching out to?', type:'text', ph:'e.g. Series A SaaS founders who do their own outreach', req:true },
        { id:'q1', label:'What do you want them to do after reading?', type:'text', ph:'e.g. Book a 20-minute demo call', req:true },
        { id:'q2', label:"What's your single strongest value point for them?", type:'text', ph:'e.g. We cut their churn by 30% in 90 days on average', req:false },
        { id:'q3', label:'Warm intro or completely cold?', type:'opts', opts:['Warm — we have a connection','Cold — no prior relationship'], req:false }
      ],
      analysis:[
        { id:'q0', label:'Who will read this and what decision does it need to support?', type:'text', ph:'e.g. CFO deciding whether to expand to a new market', req:true },
        { id:'q1', label:"What's your current hypothesis or conclusion?", type:'text', ph:'e.g. We should expand — unit economics support it', req:false },
        { id:'q2', label:'What data or sources do you have available?', type:'text', ph:'e.g. 12 months of sales data, 3 competitor reports', req:false },
        { id:'q3', label:'How long can the final output be?', type:'opts', opts:['1-page executive summary','3–5 page report','As detailed as needed'], req:false }
      ],
      strategy:[
        { id:'q0', label:'What specific goal or problem does this strategy need to solve?', type:'text', ph:'e.g. Grow MRR from $80k to $200k in 12 months', req:true },
        { id:'q1', label:"What's the single biggest obstacle right now?", type:'text', ph:'e.g. Sales cycle averages 90+ days', req:false },
        { id:'q2', label:"What's already been tried that didn't work?", type:'text', ph:'e.g. Hired 2 more AEs — no improvement', req:false },
        { id:'q3', label:'Who owns execution — is there a clear decision-maker?', type:'text', ph:'e.g. CEO and Head of Sales', req:false }
      ],
      coding:[
        { id:'q0', label:'Language, framework, or platform?', type:'text', ph:'e.g. Python, React + TypeScript, Node.js', req:true },
        { id:'q1', label:'Production-ready or a working prototype?', type:'opts', opts:['Production-ready code','Working prototype / POC'], req:false },
        { id:'q2', label:'Any constraints or requirements I should know about?', type:'text', ph:'e.g. Must handle 1M requests/day, no external dependencies', req:false }
      ],
      writing:[
        { id:'q0', label:'Who is this for? Describe the reader.', type:'text', ph:'e.g. Senior managers at mid-size companies who are short on time', req:true },
        { id:'q1', label:'What do you want them to feel or do after reading?', type:'text', ph:'e.g. Trust us enough to book a call', req:false },
        { id:'q2', label:'What tone are you going for?', type:'opts', opts:['Professional and authoritative','Warm and conversational','Direct and concise'], req:false },
        { id:'q3', label:'Any specific angle, story, or data point to include?', type:'text', ph:'e.g. Reference the Acme Corp case study', req:false }
      ],
      creative:[
        { id:'q0', label:'Who is this creative work for? One sentence.', type:'text', ph:"e.g. Gen Z men who distrust traditional brands", req:true },
        { id:'q1', label:"What's the one thing you want them to remember?", type:'text', ph:"e.g. This brand is built for people who don't follow rules", req:false },
        { id:'q2', label:'What territory feels right?', type:'opts', opts:['Bold and provocative','Witty and clever','Warm and human','Clean and minimal'], req:false }
      ],
      education:[
        { id:'q0', label:'Who are you explaining this to? Describe their background.', type:'text', ph:'e.g. New hire with no finance background', req:true },
        { id:'q1', label:'What should they understand or be able to do after?', type:'text', ph:'e.g. Explain DCF valuation to a client in plain English', req:false },
        { id:'q2', label:'How deep should it go?', type:'opts', opts:['Quick 2-minute overview','Thorough but accessible','Deep dive — they need to become an expert'], req:false }
      ]
    };

    function generateQuestions(type: string) {
      return QUESTIONS[type] || QUESTIONS.writing;
    }

    function renderQuestions(qs: any[]) {
      const container = document.getElementById('q-fields');
      if (!container) return;
      container.innerHTML = '';
      const buildBtn = document.getElementById('build-btn') as HTMLButtonElement;
      if (buildBtn) buildBtn.disabled = true;

      qs.forEach((q: any, i: number) => {
        const item = document.createElement('div');
        item.className = 'q-item';
        item.dataset.qid = q.id;

        let inputHTML = '';
        if (q.type === 'text') {
          inputHTML = `<input class="q-input-line" id="qinput-${q.id}" data-idx="${i}" data-req="${q.req}"
            placeholder="${q.ph}" oninput="(window as any).checkQAnswers()" autocomplete="off">`;
        } else {
          inputHTML = `<div class="q-opts">${q.opts.map((o: string, oi: number) =>
            `<button class="q-opt" data-idx="${i}" data-oi="${oi}" data-req="${q.req}" onclick="(window as any).selectOpt(this)">${o}</button>`
          ).join('')}</div>`;
        }

        item.innerHTML = `<div class="q-num">${String(i+1).padStart(2,'0')}</div>
          <div class="q-label-text">${q.label}</div>${inputHTML}`;
        container.appendChild(item);

        setTimeout(() => item.classList.add('revealed'), 80 + i * 120);
      });
    }

    function checkQAnswers() {
      const fields = document.getElementById('q-fields');
      if (!fields) return;
      const reqInputs = fields.querySelectorAll('[data-req="true"]');
      let allFilled = true;
      reqInputs.forEach((el: any) => {
        if (el.tagName === 'INPUT' && !el.value.trim()) allFilled = false;
      });
      const reqOptGroups = new Set<string>();
      fields.querySelectorAll('.q-opt[data-req="true"]').forEach((o: any) => reqOptGroups.add(o.dataset.idx));
      reqOptGroups.forEach(idx => {
        const selected = fields.querySelector(`.q-opt[data-idx="${idx}"].selected`);
        if (!selected) allFilled = false;
      });
      const buildBtn = document.getElementById('build-btn') as HTMLButtonElement;
      if (buildBtn) buildBtn.disabled = !allFilled;
    }

    function collectAnswers() {
      const answers: any = {};
      const fields = document.getElementById('q-fields');
      if (!fields) return answers;
      fields.querySelectorAll('.q-item').forEach((item: any) => {
        const qid = item.dataset.qid;
        const inp = item.querySelector('.q-input-line') as HTMLInputElement;
        if (inp) {
          answers[qid] = inp.value.trim();
        } else {
          const sel = item.querySelector('.q-opt.selected');
          answers[qid] = sel ? sel.textContent.trim() : '';
        }
      });
      return answers;
    }

    function resetPhases() {
      [1,2,3].forEach(n => {
        const ph = document.getElementById(`ph-${n}`);
        if (ph) ph.classList.remove('active','done');
      });
    }
    function activatePhase(n: number) {
      const ph = document.getElementById(`ph-${n}`);
      if (ph) ph.classList.add('active');
    }
    function donePhase(n: number) {
      const ph = document.getElementById(`ph-${n}`);
      if (ph) { ph.classList.remove('active'); ph.classList.add('done'); }
    }
    function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

    function prepareOutput(text: string) {
      const badge = document.getElementById('out-badge');
      if (badge) badge.textContent = 'GOATMODE';
      const outputText = document.getElementById('output-text');
      if (outputText) outputText.innerHTML = '';
      const btn = document.getElementById('copy-btn');
      if (btn) { btn.classList.remove('copied'); btn.textContent = 'COPY PROMPT'; }
    }

    /* ═══ STREAMING ══════════════════════════════════════ */
    async function streamOutput(text: string) {
      const elRaw = document.getElementById('output-text');
      if (!elRaw) return;
      const el = elRaw as HTMLElement;
      el.innerHTML = '';
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      el.appendChild(cursor);

      const lines = text.split('\n');
      const lineData = lines.map(line => {
        let cls = 'pt-body';
        const t = line.trim();
        if (/^<[a-z_][a-z_]*>$/.test(t)) cls = 'pt-tag';
        else if (/^<\/[a-z]/.test(t)) cls = 'pt-tag-c';
        else if (/^\d+\.\s/.test(t)) cls = 'pt-step';
        else if (/^- /.test(t)) cls = 'pt-item';
        return { text: line, cls };
      });

      const CHUNK = 22, TICK = 38;
      let lineIdx = 0, charIdx = 0, currentSpan: HTMLElement | null = null;

      return new Promise<void>(resolve => {
        function step() {
          let budget = CHUNK;
          while (budget > 0 && lineIdx < lineData.length) {
            const { text: line, cls } = lineData[lineIdx];
            if (line === '') {
              const sp = document.createElement('span'); sp.className = 'pt-spacer';
              el.insertBefore(sp, cursor);
              lineIdx++; charIdx = 0; currentSpan = null; budget -= 2; continue;
            }
            if (charIdx === 0) {
              currentSpan = document.createElement('span');
              currentSpan.className = `pt-line ${cls}`;
              el.insertBefore(currentSpan, cursor);
            }
            const end = Math.min(charIdx + budget, line.length);
            if (currentSpan) currentSpan.textContent += line.slice(charIdx, end);
            budget -= (end - charIdx); charIdx = end;
            if (charIdx >= line.length) {
              const br = document.createElement('span'); br.className = 'pt-spacer'; br.style.height='0';
              el.insertBefore(br, cursor);
              lineIdx++; charIdx = 0; currentSpan = null;
            }
          }
          if (el.parentElement) el.parentElement.scrollTop = el.parentElement.scrollHeight;
          if (lineIdx < lineData.length) setTimeout(step, TICK);
          else { cursor.remove(); resolve(); }
        }
        setTimeout(step, TICK);
      });
    }

    /* ═══ TECHNIQUE CARDS ════════════════════════════════ */
    const TECHNIQUES: any = {
      negotiation: [
        { code:'VALUE-FIRST ANCHORING', desc:'Opening with a specific, measurable result you delivered shifts the frame from "wanting more" to "being paid accurately for what you produce." This is the single highest-leverage move in any salary conversation.' },
        { code:'ASK SEPARATION', desc:"This prompt instructs AI to make the email's only job getting the meeting — not winning the raise. Collapsing those two goals into one email is the most common reason salary requests fail cold." },
        { code:'CONSTRAINT ARCHITECTURE', desc:'Banning "deserve," "just wanted to," and apology language removes the 6 most common phrases that signal low confidence to a manager — before a single word of content is even read.' }
      ],
      communication: [
        { code:'SBI FRAMEWORK', desc:'Situation → Behaviour → Impact forces the AI to separate what happened from how it felt — the most important discipline in any high-stakes professional conversation.' },
        { code:'HEADLINE FIRST', desc:'Instructing the AI to state the core message before drafting means the reader gets clarity, not anxiety. Burying hard news is the most common communication mistake at every seniority level.' },
        { code:'RELATIONSHIP PRESERVATION', desc:'The quality standard explicitly requires the conversation to end with the relationship intact. Without this constraint, AI defaults to technically correct but relationally damaging language.' }
      ],
      marketing: [
        { code:'ROLE INJECTION', desc:'Assigning me an expert identity first activates specialized knowledge pathways — not my general writing defaults.' },
        { code:'PAS FRAMEWORK', desc:'Problem → Agitate → Solution — the backbone of the highest-converting cold outreach ever written, baked into my scaffold.' },
        { code:'CONSTRAINT MAPPING', desc:'Explicit prohibitions ("no clichés", "no passive voice") short-circuit my tendency toward generic, hedged language.' }
      ],
      coding: [
        { code:'ROLE INJECTION', desc:'A principal-engineer identity tells me to optimize for production readiness and edge cases — not just "working code".' },
        { code:'PRE-WORK REASONING', desc:'Asking me to identify failure modes before writing forces a planning pass that dramatically reduces bugs.' },
        { code:'OUTPUT SPECIFICATION', desc:'Defining the exact deliverable eliminates my default of producing the minimum viable response.' }
      ],
      analysis: [
        { code:'PYRAMID PRINCIPLE', desc:'Lead with conclusion, support with evidence — the McKinsey framework. Without this, I bury the lead by default.' },
        { code:'MECE STRUCTURE', desc:'Mutually Exclusive, Collectively Exhaustive framing stops me producing redundant or gappy analysis.' },
        { code:'PRE-WORK REASONING', desc:'The cognition block forces me to form a hypothesis and test it — rather than narrating as I go.' }
      ],
      strategy: [
        { code:'CONSTRAINT-FIRST', desc:'Identifying the binding constraint before tactics mirrors how great operators think — fix the bottleneck, not the symptoms.' },
        { code:'SPECIFICITY FORCING', desc:'Requiring owners, timelines, and success metrics stops me defaulting to vague strategic direction.' },
        { code:'PRE-WORK REASONING', desc:'The cognition block forces me to map the system before prescribing actions — diagnosis before treatment.' }
      ],
      creative: [
        { code:'FIRST IDEA VETO', desc:'Prohibiting the obvious forces me past my highest-probability outputs and into genuinely original territory.' },
        { code:'CONCEPT-FIRST', desc:'Territory before execution stops me generating tactics without strategic grounding.' },
        { code:'BRIEF ANCHORING', desc:'Brief-first framing means every idea is evaluated against the actual problem, not just aesthetic appeal.' }
      ],
      education: [
        { code:'FEYNMAN TECHNIQUE', desc:'If I can explain it to a 12-year-old, I truly understand it. This instruction calibrates my abstraction to genuine clarity.' },
        { code:'KEYSTONE FIRST', desc:'Leading with the single most important concept before complexity is how understanding is built, not just conveyed.' },
        { code:'CONFUSION MAPPING', desc:"Pre-empting the 3 most common misconceptions shows I understand the learner's mental model, not just the subject." }
      ],
      writing: [
        { code:'READER-FIRST STRUCTURE', desc:'Every structural decision in this prompt is optimized for the reader, not the writer — the hardest discipline in writing.' },
        { code:'ECONOMY OF LANGUAGE', desc:'The instruction to cut 20% forces me toward precision. Padding is my default when unconstrained.' },
        { code:'RESONANT CLOSE', desc:'Separating "resonant close" from "summary" tells me to end with meaning, not repetition — the mark of publishable work.' }
      ]
    };

    function showTechniques(type: string) {
      const techs = TECHNIQUES[type] || TECHNIQUES.writing;
      const grid = document.getElementById('tech-grid');
      if (grid) {
        grid.innerHTML = techs.map((t: any) => `
          <div class="tc">
            <div class="tc-code">${t.code}</div>
            <div class="tc-desc">${t.desc}</div>
          </div>
        `).join('');
      }
      const sec = document.getElementById('technique-section');
      if (sec) {
        sec.style.display = 'block';
        setTimeout(() => sec.classList.add('visible'), 40);
      }
    }

    /* ═══ COPY ════════════════════════════════════════════ */
    function copyPrompt() {
      const outputText = document.getElementById('output-text');
      const text = outputText ? outputText.textContent : '';
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const card = document.getElementById('output-card');
        if (card) card.classList.add('transmitting');
        const btn = document.getElementById('copy-btn');
        if (btn) { btn.classList.add('copied'); btn.textContent = '✓ COPIED'; }
        const toast = document.getElementById('toast');
        if (toast) toast.classList.add('show');
        setTimeout(() => {
          if (card) card.classList.remove('transmitting');
          if (toast) toast.classList.remove('show');
        }, 1200);
        setTimeout(() => {
          if (btn) { btn.classList.remove('copied'); btn.textContent = 'COPY PROMPT'; }
        }, 2400);
      });
    }

    /* ═══ BACKEND API CALL ═══════════════════════════════ */
    async function fetchClaudeTransform(raw: string, answers: any) {
      let userContent = raw;
      if (answers) {
        const filled = Object.entries(answers).filter(([, v]: any) => v && v.trim());
        if (filled.length > 0) {
          userContent += '\n\nContext from my answers:\n' + filled.map(([, v]: any) => `- ${v}`).join('\n');
        }
      }
      const res = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userContent, systemPrompt: buildMetaPrompt() })
      });
      if (!res.ok) throw new Error('API ' + res.status);
      const data = await res.json();
      return data.text;
    }

    function buildMetaPrompt() {
      return `You are a world-class prompt engineer specialising in professional and business use cases. Transform the user's rough idea into a master-level AI prompt.

Detect and infer: task type, ideal expert role, implied audience, output format, tone, constraints. Prioritise professional, workplace, and knowledge-worker scenarios.

Always include:
1. Specific named expert role (specialty, caliber, years of experience)
2. Audience with psychographic detail — who will receive this output
3. Methodology and expert frameworks relevant to the task
4. Step-by-step numbered task instructions (6–9 steps)
5. Exact output format specification — what the deliverable looks like
6. Quality bar — what "excellent" looks like in concrete terms
7. Specific constraints — 5+ things NOT to do that would ruin the output
8. Reasoning instruction for analytical or complex tasks

Rules:
- The enhanced prompt must be 10–20x more detailed than the input
- Write addressed to the AI ("You are...", "Your task is...")
- Every sentence must do work — no filler
- Output ONLY the enhanced prompt — no preamble, no explanation
- Format using Claude-native XML tags: <role>, <context>, <objective>, <methodology>, <task>, <output_format>, <quality_standard>, <constraints>, <cognition>

Transform this into a master prompt:`;
    }

    /* ═══ OFFLINE ENGINE ══════════════════════════════════ */
    function buildOfflinePrompt(raw: string, answers: any) {
      const type = currentType || detectType(raw);
      const role = getRole(type);
      const audience = inferAudience(type);
      const methodology = getMethodology(type);
      const instructions = buildInstructions(raw, type);
      const format = inferFormat(type);
      const quality = getQuality(type);
      const constraints = getConstraints(type);
      const reasoning = needsReasoning(type) ? getReasoningBlock() : '';
      return formatClaude(role, audience, raw, methodology, instructions, format, quality, constraints, reasoning, answers);
    }

    function detectType(t: string) {
      const l = t.toLowerCase();
      if (/\b(raise|salary|promotion|pay increase|compensation|performance review|negotiate|negotiat)\b/.test(l)) return 'negotiation';
      if (/\b(difficult conversation|hard conversation|hard talk|tough talk|confrontation|conflict|feedback to|performance issue)\b/.test(l)) return 'communication';
      if (/\b(delay|setback|bad news|problem to (client|boss|team)|explain to|update to|status update|project update)\b/.test(l)) return 'communication';
      if (/\b(code|build|develop|program|function|app|api|script|debug|refactor|implement)\b/.test(l)) return 'coding';
      if (/\b(market|campaign|ad|copy|brand|pitch|sales|email|cold email|outreach|convert|funnel)\b/.test(l)) return 'marketing';
      if (/\b(analyz|review|compar|evaluat|assess|research|investigat|audit|diagnos)\b/.test(l)) return 'analysis';
      if (/\b(plan|strateg|roadmap|framework|how to|steps to|guide to|system|scale)\b/.test(l)) return 'strategy';
      if (/\b(brainstorm|ideas|creative|concept|innovat|name|slogan|invent)\b/.test(l)) return 'creative';
      if (/\b(explain|teach|learn|understand|break down|simplif|what is|how does)\b/.test(l)) return 'education';
      return 'writing';
    }

    function getRole(type: string): string {
      const roles: any = {
        negotiation:`You are a career strategist and former HR Director with 22 years of compensation negotiations. You have coached 400+ professionals to an average 23% raise. You know exactly what makes managers say yes — and what phrases make them say "not yet."`,
        communication:`You are an executive communications coach and former Chief People Officer. You have guided 300+ professionals through high-stakes conversations — bad news, conflict, performance issues — and kept every relationship intact.`,
        coding:`You are a Principal Software Engineer with 18 years of production experience at Google and Stripe. You write clean, secure, maintainable code and have zero tolerance for unhandled exceptions or sloppy variable names.`,
        marketing:`You are a direct-response copywriter with 20 years of experience. Your campaigns have generated over $500M in revenue. Every word you write is doing a specific job — if it isn't, you cut it.`,
        analysis:`You are a senior strategy analyst trained at McKinsey. You write in the Pyramid Principle: conclusion first, evidence second. Every claim is supported. Every recommendation specifies who acts, by when.`,
        strategy:`You are an operator and growth strategist who has founded two companies ($0–$30M ARR) and advised 60+ startups. You think in constraints and binding bottlenecks, not frameworks and buzzwords.`,
        creative:`You are an Executive Creative Director with 22 years at Wieden+Kennedy. You have won Cannes Lions and have a pathological intolerance for the obvious first idea.`,
        education:`You are a science communicator with a PhD in Cognitive Science and three bestselling books. You deploy the Feynman Technique by instinct and have a sixth sense for where learners get lost.`,
        writing:`You are a professional writer with 20 years of bylines in The Atlantic and Harvard Business Review. You believe the first draft is always too long and every sentence's job is to make the reader want the next one.`,
      };
      return roles[type] || `You are a professional writer with 20 years of bylines in The Atlantic and Harvard Business Review.`;
    }

    function inferAudience(type: string): string {
      const audiences: any = {
        negotiation:`a direct manager who is busy, slightly risk-averse, and will likely forward this to HR — someone who responds to value delivered, not tenure or personal need`,
        communication:`a professional who is about to hear something uncomfortable — a person who will be evaluating not just what you say but how you say it, and who will remember the conversation long after it ends`,
        coding:`engineers and technical reviewers who will read, maintain, and build on this code — people with high standards who will notice every sloppy variable name and missing error handler`,
        marketing:`a specific, skeptical individual who is time-poor and mildly cynical — they have seen a hundred pitches this week and will delete yours in 3 seconds unless you earn their attention immediately`,
        analysis:`senior executives and board members who have 8 minutes, not 80, and need to walk away with a clear recommendation they can defend — not a list of considerations`,
        strategy:`a founder or operator who is already overwhelmed, has heard generic advice a hundred times, and needs something specific, sequenced, and executable starting Monday`,
        creative:`the target audience for the brand — people who are culturally literate, resistant to obvious advertising, and will respond only to ideas that feel made for them specifically`,
        education:`an intelligent adult with no prior background who is genuinely curious and wants to actually understand — not just nod along — and will immediately sense condescension`,
        writing:`an educated, busy reader with genuinely high standards who will stop reading the moment the writing feels lazy, generic, or padded`,
      };
      return audiences[type] || `an educated, busy reader with genuinely high standards`;
    }

    function getMethodology(type: string): string {
      const methodologies: any = {
        negotiation:`Anchor on value created, not tenure. Brag → Ask → CTA: one result, one number, one frictionless next step. The email's only job is to get the meeting.`,
        communication:`SBI Framework: Situation (what happened) → Behaviour (specifically what) → Impact (what it caused). Lead with empathy, state the reality clearly, close with a concrete path forward. Never bury the headline.`,
        coding:`Single Responsibility (each function does one thing). Explicit over implicit (code reads like its description). Fail loudly (errors caught at the boundary, never silently swallowed). Write for the next engineer.`,
        marketing:`PAS backbone (Problem → Agitate → Solution). Hook earns the next sentence. Specifics beat adjectives. One CTA — no alternatives. Social proof reduces perceived risk for cold audiences.`,
        analysis:`Pyramid Principle: conclusion first, MECE evidence second. "So what?" test on every data point. Hypothesis-driven: state it, test it, report it. Fact vs inference vs recommendation — never blur.`,
        strategy:`First-principles decomposition. Identify the binding constraint first. 80/20 on actions. Structure: Diagnosis → Guiding Policy → Coherent Actions. Every action needs an owner, metric, and failure mode.`,
        creative:`Human truth first, then cultural tension, then the First Idea Veto. Three distinct territories (not executions). Test each against the brief: would this make a competitor uncomfortable?`,
        education:`Feynman Technique: explain to a smart 12-year-old, add complexity only as needed. Keystone First: the one concept without which nothing else makes sense. Analogies as the primary tool.`,
        writing:`Opening is an audition — earn the next minute in the first sentence. Vary sentence length: long for momentum, short for impact. Cut first draft by 20%. Ending resonates, never summarises.`,
      };
      return methodologies[type] || `Precision, economy of language, and reader-first thinking throughout.`;
    }

    function buildInstructions(raw: string, type: string): string {
      const a = currentAnswers || {};
      const use = (val: any, fallback: string) => (val && val.trim()) ? val.trim() : fallback;

      const map: any = {
        negotiation: () => {
          const achievement = use(a.q0, '[your specific achievement with measurable result]');
          const target = use(a.q1, '[your target % or dollar amount]');
          const tone = use(a.q3, 'professional');
          return `1. Subject: "Quick chat about my comp?" — not "Salary Discussion."\n  2. First sentence — state the achievement as fact: "${achievement}"\n  3. One sentence connecting that result to the ask. No "I feel I deserve."\n  4. The number: ${target}. A number, not a range.\n  5. CTA: "15 minutes this week?" — then stop. Nothing after the CTA.\n  6. Under 150 words. Every extra word reduces your chances.\n  7. Tone: ${tone} — every word should match how this person actually communicates.`;
        },
        communication: () => {
          const msg = use(a.q0, '[the core thing you need to say]');
          const recipient = use(a.q1, 'the recipient');
          const fmt = use(a.q2, 'written message');
          const outcome = use(a.q3, '[the outcome you need]');
          return `1. Core message: "${msg}" — state this by paragraph 2 at the latest.\n  2. Open with empathy or shared context. Do not bury the headline.\n  3. Use SBI: Situation (what happened), Behaviour (specifically what), Impact (what it caused).\n  4. Recipient: ${recipient} — calibrate every word to how they receive difficult news.\n  5. Format: ${fmt} — adjust formality and length accordingly.\n  6. Close with one concrete next step. Vague endings create anxiety.\n  7. Goal: ${outcome} — every sentence should move toward that.\n  8. Include: the one phrase NOT to say that would derail this entirely.`;
        },
        marketing: () => {
          const target = use(a.q0, '[your specific target audience]');
          const goal = use(a.q1, '[the one action you want them to take]');
          const offer = use(a.q2, '[your strongest value point]');
          const warmth = use(a.q3, 'cold outreach');
          return `1. Target: ${target} — every word must feel written for this specific person.\n  2. Hook: earn the next sentence in the first 8 words. Rewrite it 3 times. Use the best.\n  3. Lead with proof: "${offer}" — specifics before claims, always.\n  4. ${warmth === 'Cold — no prior relationship' ? 'Cold outreach: establish relevance in the first line or you lose them.' : 'Warm context: reference the connection early — it changes everything.'}\n  5. One CTA: ${goal}. No alternatives. No softening.\n  6. Write 3 subject line variants. Label each formula.\n  7. Cut every word that isn't moving the reader toward the CTA.`;
        },
        analysis: () => {
          const audience = use(a.q0, '[who reads this and what they need to decide]');
          const hypothesis = use(a.q1, '[your current conclusion or hypothesis]');
          const data = use(a.q2, '[available data and sources]');
          return `1. Audience: ${audience} — lead with what they need to decide, not context.\n  2. State your conclusion first (Pyramid Principle). Every section supports it.\n  3. Hypothesis: "${hypothesis}" — test it. If it breaks, say so explicitly.\n  4. Data: ${data} — use what exists, flag what's missing.\n  5. Apply the "So what?" test to every data point. If you can't say why it matters, cut it.\n  6. Distinguish clearly: fact / inference / recommendation — never blur these.\n  7. End with 3–5 prioritised recommendations: action, owner, timeline, success metric.`;
        },
        strategy: () => {
          const goal = use(a.q0, '[the specific goal this strategy must achieve]');
          const obstacle = use(a.q1, '[the single biggest obstacle]');
          const tried = use(a.q2, '[what has already been tried]');
          const owner = use(a.q3, '[the decision-maker]');
          return `1. Diagnose first: describe the actual situation precisely. Goal: ${goal}\n  2. Binding constraint: ${obstacle} — this is the bottleneck. Fix it before anything else.\n  3. What's already failed: ${tried} — do not recommend these again.\n  4. Define the guiding policy: one approach that directly addresses the constraint.\n  5. Coherent actions: each one reinforces the guiding policy.\n  6. 30/60/90 day plan: what gets done, who owns it, what success looks like.\n  7. Owner: ${owner} — every recommendation must be actionable by them starting Monday.\n  8. Risk register: top 2 risks, likelihood, impact, specific mitigation.`;
        },
        coding: () => {
          const lang = use(a.q0, '[the language or framework]');
          const prodType = use(a.q1, 'production-ready code');
          const constraints = use(a.q2, 'standard requirements');
          return `1. Language/framework: ${lang} — use its conventions and idioms throughout.\n  2. Type: ${prodType} — calibrate quality bar accordingly.\n  3. State the core problem in one sentence before writing a line of code.\n  4. Write modular functions — each does one thing. Name them like documentation.\n  5. Constraints: ${constraints} — handle them explicitly, not as an afterthought.\n  6. Error handling at every boundary. Never silently swallow exceptions.\n  7. Usage example showing the primary use case.`;
        },
        writing: () => {
          const reader = use(a.q0, '[describe the reader]');
          const goal = use(a.q1, '[what you want them to feel or do]');
          const tone = use(a.q2, 'professional');
          const angle = use(a.q3, '');
          return `1. Reader: ${reader} — every structural decision is optimised for them.\n  2. Goal: ${goal} — the reader should feel this by the last line.\n  3. Tone: ${tone} — maintain it in every sentence, not just the opener.\n  4. Opening: earn the next minute in the first sentence. Write it last.\n  5. ${angle ? `Include: "${angle}" — work this in, don't tack it on.` : 'Every paragraph ends with a reason to read the next.'}\n  6. Cut the first draft by 20%. Padding is the default when unconstrained.\n  7. Closing: emotional punctuation, not summary.`;
        },
        creative: () => {
          const audience = use(a.q0, '[describe the audience]');
          const memory = use(a.q1, '[the one thing they should remember]');
          return `1. Human truth: what does ${audience} deeply feel, fear, or want? Lead with this.\n  2. Apply the First Idea Veto: generate the obvious interpretation, then discard it.\n  3. Generate 3 distinct creative territories — not executions, strategic directions.\n  4. Each territory: one-sentence concept + two-line rationale. Name it.\n  5. The one thing they must remember: "${memory}" — every territory must deliver this.\n  6. Cut any territory a cautious competitor would also produce.\n  7. Develop the strongest territory to a brief execution sketch.`;
        },
        education: () => {
          const learner = use(a.q0, '[describe the learner and their background]');
          const outcome = use(a.q1, '[what they should understand or be able to do]');
          return `1. Keystone concept: the single idea without which nothing else makes sense. Lead with this.\n  2. Learner: ${learner} — calibrate every analogy and example to their existing knowledge.\n  3. Find an everyday analogy that makes the core concept immediately intuitive.\n  4. Build in layers — introduce complexity only after the previous layer is solid.\n  5. Outcome: ${outcome} — test every explanation against this. If it doesn't serve it, cut it.\n  6. Address 3 common misconceptions by name before the learner hits them.\n  7. Sticky close: one sentence they can repeat tomorrow and still have it mean something.`;
        },
      };
      return map[type] ? map[type]() : map.writing();
    }

    function inferFormat(type: string): string {
      const formats: any = {
        negotiation:`(a) Subject line + one-line rationale. (b) Complete email, zero placeholders, under 150 words. (c) What to do if no reply in 5 days.`,
        communication:`(a) Core message in one sentence. (b) Complete message or script, ready to use. (c) The one phrase NOT to say.`,
        coding:`(a) Architecture note — approach and key decisions in 2-3 lines. (b) Full implementation with inline comments on non-obvious logic. (c) Usage example. (d) Edge cases handled.`,
        marketing:`(a) 3 subject/headline options — label the formula used. (b) Full copy: hook, body, CTA. (c) One-line note on the key strategic choice made.`,
        analysis:`(a) Executive Summary — 3 bullets max. (b) Structured analysis, MECE. (c) Recommendations table: Action | Owner | Timeline | Success Metric.`,
        strategy:`(a) Diagnosis. (b) Binding constraint. (c) Top 3 priorities, ranked. (d) 30/60/90-day plan with owners and success metrics. (e) Risk register: top 2 risks + mitigations.`,
        creative:`(a) 3 territories — named, one-sentence concept, two-line rationale. (b) Recommended direction with execution sketch. (c) Why this territory, not the others.`,
        education:`(a) Keystone concept. (b) The analogy. (c) Layered explanation. (d) 3 common misconceptions addressed. (e) Sticky one-sentence summary.`,
        writing:`Complete, structured piece: commanding opening, developed middle, resonant close. Include a suggested headline.`,
      };
      return formats[type] || `A complete, structured response appropriate to the task.`;
    }

    function getQuality(type: string): string {
      const quality: any = {
        negotiation:`A direct manager reads it and thinks: "Short, specific, confident. I can work with this."`,
        communication:`A neutral observer says: "That's how a professional handles a hard situation." The relationship survives.`,
        coding:`A senior engineer reviews this PR and approves it. No pseudocode, no TODOs, no unhandled edge cases.`,
        marketing:`A sceptical CMO reads it and says: "Yes, send it." Every sentence doing a job.`,
        analysis:`A CFO challenges any point in this and finds it defensible. Recommendations are specific enough to act on today.`,
        strategy:`A team lead receives this and starts working on Monday without a follow-up meeting needed.`,
        creative:`A good creative director leans forward. Original without being alienating, strategic without being soulless.`,
        education:`The reader feels genuinely smarter — with a mental model they can explain to someone else tomorrow.`,
        writing:`Could run in a respected publication with light editing. Precise, structured, no sentence is padding.`,
      };
      return quality[type] || `Precise, structured, every sentence earning its place.`;
    }

    function getConstraints(type: string): string {
      const constraints: any = {
        negotiation:`No: "deserve," "I just wanted to...," apologies, salary comparisons, ranges. 150-word maximum. Match the manager's tone.`,
        communication:`No: buried headlines, passive accountability ("mistakes were made"), over-apologising, vague next steps, character judgements. End with a clear path forward.`,
        coding:`No: pseudocode, placeholder comments, generic variable names (data/temp/x), silent exception swallowing, over-engineering for hypothetical requirements.`,
        marketing:`No: "game-changer," "revolutionary," "seamless," "leverage," passive voice, CTAs weaker than a direct imperative, unsupported claims.`,
        analysis:`No: vague conclusions ("it depends"), unsupported assertions, buried recommendations, jargon without definition, recommendations without an owner and timeline.`,
        strategy:`No: generic framework application, recommendations without owners, strategy-speak ("leverage core competencies"), treating every priority as top priority.`,
        creative:`No: first ideas, work a cautious brand manager would love, "unusual" confused with "strategic," executions without a concept, work that looks comfortable next to a competitor's.`,
        education:`No: jargon without immediate plain-language definition, skipped logical steps, condescension, "as everyone knows" / "simply" / "obviously," ending without a concrete takeaway.`,
        writing:`No: "in conclusion," "it is important to note," "needless to say," passive voice when active works, closing that summarises instead of resonates.`,
      };
      return constraints[type] || `No filler, passive voice, or vague language. Precise and direct.`;
    }

    function needsReasoning(type: string) { return ['analysis','strategy','coding'].includes(type); }
    function getReasoningBlock() {
      return `Before producing your final output, think step by step: (1) What is the single most important thing to get right here? (2) What are the hard constraints and key trade-offs? (3) What is the structural logic of your response? Only after this internal reasoning should you produce the output.`;
    }

    /* ═══ FORMATTERS ══════════════════════════════════════ */
    function formatClaude(role: string, audience: string, raw: string, methodology: string, instructions: string, format: string, quality: string, constraints: string, reasoning: string, answers: any) {
      const a = answers || {};
      const filled = Object.values(a).filter((v: any) => v && v.trim());

      const L: string[] = [];
      L.push('<role>');
      L.push(`  ${role}`);
      L.push('</role>'); L.push('');

      L.push('<context>');
      L.push(`  Task: "${raw}"`);
      if (filled.length > 0) {
        filled.forEach((v: any) => L.push(`  — ${v}`));
      }
      L.push(`  Audience: ${audience}`);
      L.push('</context>'); L.push('');

      L.push('<objective>');
      L.push(`  ${inferObjective(raw, currentType)}`);
      L.push('</objective>'); L.push('');

      L.push('<task>');
      L.push(`  ${instructions}`);
      L.push('</task>'); L.push('');

      L.push('<constraints>');
      L.push(`  ${constraints}`);
      L.push('</constraints>'); L.push('');

      L.push('<output_format>');
      L.push(`  ${format}`);
      L.push('</output_format>'); L.push('');

      L.push('<quality_standard>');
      L.push(`  ${quality}`);
      L.push('</quality_standard>');

      if (reasoning) { L.push(''); L.push('<cognition>'); L.push(`  ${reasoning}`); L.push('</cognition>'); }
      return L.join('\n');
    }

    function inferObjective(raw: string, type: string): string {
      const targets: any = {
        negotiation: `One send-ready email under 150 words. Goal: get the meeting, not win the raise.`,
        communication: `One clear, complete message that delivers the core news and opens the path forward.`,
        marketing: `Copy that earns the next sentence in the first 8 words and ends with one unmistakable CTA.`,
        analysis: `A structured analysis: conclusion first, evidence second, recommendations last. Actionable by the reader today.`,
        strategy: `A clear strategy document: diagnosis, priorities, 30/60/90-day actions with owners and success metrics.`,
        coding: `Working, production-quality code with usage example and edge cases handled.`,
        writing: `A complete, publication-ready piece that earns every reader's attention from the first sentence.`,
        creative: `3 distinct creative territories — not executions — each with a concept and rationale.`,
        education: `An explanation that leaves the reader genuinely understanding, not just nodding along.`,
      };
      return targets[type] || `A complete, expert-level response to: "${raw}". Professional bar. No filler.`;
    }

    /* ═══ EXPOSE TO JSX onClick HANDLERS ════════════════ */
    (window as any).startTransform = startTransform;
    (window as any).buildFinalPrompt = buildFinalPrompt;
    (window as any).goBack = goBack;
    (window as any).useExample = useExample;
    (window as any).selectOpt = selectOpt;
    (window as any).copyPrompt = copyPrompt;
    (window as any).checkQAnswers = checkQAnswers;
    (window as any).onInput = onInput;
    (window as any).handleKey = handleKey;

    /* ═══ BOOT — dark glitch sequence ════════════════════ */
    (function bootSequence() {
      const boot = document.getElementById('boot');
      const app = document.getElementById('app');
      const logoWrap = document.getElementById('boot-logo-wrap');
      const nameEl = document.getElementById('boot-name');
      const tagEl = document.getElementById('boot-tag');
      if (!boot || !app || !logoWrap || !nameEl || !tagEl) return;

      const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%_-=+[]{}|<>?';
      const FINAL_NAME = 'GOATMODE.AI';

      function scramble(el: HTMLElement, finalText: string, duration: number) {
        const parts = finalText.split('');
        const frames = 24;
        let f = 0;
        const iv = setInterval(() => {
          el.innerHTML = parts.map((c, i) => {
            if (c === '.' || c === ' ') return c === '.' ? '<em>.</em>' : ' ';
            const progress = f / frames;
            const charProg = (i + 1) / parts.length;
            if (progress >= charProg) return c;
            return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
          }).join('');
          f++;
          if (f > frames) { clearInterval(iv); el.innerHTML = 'GOATMODE<em>.AI</em>'; }
        }, duration / frames);
      }

      setTimeout(() => logoWrap.classList.add('snap'), 1200);

      setTimeout(() => {
        nameEl.classList.add('on');
        scramble(nameEl, FINAL_NAME, 520);
      }, 960);

      setTimeout(() => nameEl.classList.add('snap'), 1450);

      setTimeout(() => tagEl.classList.add('on'), 1680);

      setTimeout(() => {
        boot.classList.add('glitch-burst');
      }, 2150);

      setTimeout(() => {
        boot.classList.add('out');
        app.classList.add('on');
        setTimeout(() => {
          {
            const ri = document.getElementById('raw-input');
            if (ri) ri.focus();
          }
        }, 580);
      }, 2420);
    })();

  }, []);

  return (
    <>
      {/* Toast */}
      <div id="toast">PROMPT COPIED</div>

      {/* Boot */}
      <div id="boot">
        <div className="boot-flash"></div>
        <div className="boot-sweep"></div>
        <div className="gbar" id="gbar1"></div>
        <div className="gbar" id="gbar2"></div>
        <div className="gbar" id="gbar3"></div>
        <div className="boot-content">
          <div className="boot-logo-wrap" id="boot-logo-wrap">
            <svg width="58" height="67" viewBox="0 0 100 115" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 4 C51 12 51.8 26 52 42 C52.2 58 51.8 76 51.2 90 C50.8 102 50 113 50 114 C49.2 102 49 90 48.8 76 C48.2 58 47.8 42 48 26 C48.2 12 49 4 50 4Z"/>
              <path d="M45 12 C28 7, 7 20, 5 40 C3 56, 10 70, 22 76 L30 70 C20 64, 14 52, 15 38 C16 24, 28 15, 45 12Z"/>
              <path d="M55 12 C72 7, 93 20, 95 40 C97 56, 90 70, 78 76 L70 70 C80 64, 86 52, 85 38 C84 24, 72 15, 55 12Z"/>
              <path d="M46 52 L13 62 C8 64, 7 72, 11 77 L44 74 L46 64Z"/>
              <path d="M54 52 L87 62 C92 64, 93 72, 89 77 L56 74 L54 64Z"/>
            </svg>
          </div>
          <div className="boot-name" id="boot-name">GOATMODE<em>.AI</em></div>
          <div className="boot-tag" id="boot-tag">BUILT FOR HOW AI THINKS</div>
        </div>
      </div>

      {/* App */}
      <div id="app">

        {/* STATE 1: INPUT */}
        <div className="state active" id="state-input">
          <div className="hero">
            <div className="hero-logo">
              <svg width="44" height="51" viewBox="0 0 100 115" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 4 C51 12 51.8 26 52 42 C52.2 58 51.8 76 51.2 90 C50.8 102 50 113 50 114 C49.2 102 49 90 48.8 76 C48.2 58 47.8 42 48 26 C48.2 12 49 4 50 4Z"/>
                <path d="M45 12 C28 7, 7 20, 5 40 C3 56, 10 70, 22 76 L30 70 C20 64, 14 52, 15 38 C16 24, 28 15, 45 12Z"/>
                <path d="M55 12 C72 7, 93 20, 95 40 C97 56, 90 70, 78 76 L70 70 C80 64, 86 52, 85 38 C84 24, 72 15, 55 12Z"/>
                <path d="M46 52 L13 62 C8 64, 7 72, 11 77 L44 74 L46 64Z"/>
                <path d="M54 52 L87 62 C92 64, 93 72, 89 77 L56 74 L54 64Z"/>
              </svg>
            </div>
            <div className="hero-name">GOATMODE<span style={{color:'var(--t3)' as any}}>.AI</span></div>
            <div className="hero-tag">Your rough idea &rarr; a prompt that actually gets results</div>
          </div>

          <div className="input-zone">
            <textarea
              className="input-box"
              id="raw-input"
              placeholder="Describe what you need to do… (e.g. email my boss asking for a raise, explain a project delay to a client, prepare for a difficult conversation)"
              onInput={(e) => { (window as any).onInput && (window as any).onInput(e.target as HTMLTextAreaElement); }}
              onKeyDown={(e) => { (window as any).handleKey && (window as any).handleKey(e as any); }}
              rows={5}
            ></textarea>
            <div className="char-count" id="char-count">0 / 1000</div>

            <div className="examples">
              <span className="ex-label">Quick start &rarr;</span>
              <button className="ex-chip" onClick={(e) => (window as any).useExample && (window as any).useExample(e.currentTarget)}>Ask for a raise</button>
              <button className="ex-chip" onClick={(e) => (window as any).useExample && (window as any).useExample(e.currentTarget)}>Explain a project delay</button>
              <button className="ex-chip" onClick={(e) => (window as any).useExample && (window as any).useExample(e.currentTarget)}>Prepare for a hard talk</button>
            </div>

            <div className="input-footer-row">
              <div className="api-status">&#9679; CONNECTED</div>
            </div>

            <button className="transform-btn" id="transform-btn" onClick={() => (window as any).startTransform && (window as any).startTransform()}>
              &#9889; ENGINEER MASTER PROMPT
            </button>
          </div>
        </div>

        {/* STATE 2: THINKING */}
        <div className="state" id="state-thinking">
          <div className="thinking-logo">
            <svg width="48" height="55" viewBox="0 0 100 115" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 4 C51 12 51.8 26 52 42 C52.2 58 51.8 76 51.2 90 C50.8 102 50 113 50 114 C49.2 102 49 90 48.8 76 C48.2 58 47.8 42 48 26 C48.2 12 49 4 50 4Z"/>
              <path d="M45 12 C28 7, 7 20, 5 40 C3 56, 10 70, 22 76 L30 70 C20 64, 14 52, 15 38 C16 24, 28 15, 45 12Z"/>
              <path d="M55 12 C72 7, 93 20, 95 40 C97 56, 90 70, 78 76 L70 70 C80 64, 86 52, 85 38 C84 24, 72 15, 55 12Z"/>
              <path d="M46 52 L13 62 C8 64, 7 72, 11 77 L44 74 L46 64Z"/>
              <path d="M54 52 L87 62 C92 64, 93 72, 89 77 L56 74 L54 64Z"/>
            </svg>
          </div>
          <div className="phases" id="phases">
            <div className="phase" id="ph-1">
              <span className="phase-idx">01</span>
              <div className="phase-dot"></div>
              <span className="phase-text">READING YOUR INTENT</span>
            </div>
            <div className="phase" id="ph-2">
              <span className="phase-idx">02</span>
              <div className="phase-dot"></div>
              <span className="phase-text">BUILDING EXPERT BRIEF</span>
            </div>
            <div className="phase" id="ph-3">
              <span className="phase-idx">03</span>
              <div className="phase-dot"></div>
              <span className="phase-text">ENGINEERING YOUR PROMPT</span>
            </div>
          </div>
        </div>

        {/* STATE 3: QUESTIONS */}
        <div className="state" id="state-questions">
          <div className="q-intro">
            <div className="q-source">INPUT &rarr; <span id="q-echo"></span></div>
            <div className="q-headline">A few quick questions to get this exactly right.</div>
            <div className="q-sub">The more specific you are, the more your prompt will sound like you wrote it yourself.</div>
            <button className="q-back-link" onClick={() => (window as any).goBack && (window as any).goBack()}>&larr; start over</button>
          </div>
          <div className="q-fields" id="q-fields">
            {/* Injected dynamically */}
          </div>
          <button className="transform-btn" id="build-btn" onClick={() => (window as any).buildFinalPrompt && (window as any).buildFinalPrompt()} disabled>
            &#9889; BUILD MY MASTER PROMPT
          </button>
        </div>

        {/* STATE 4: OUTPUT */}
        <div className="state" id="state-output">
          <div className="output-top">
            <div className="original-idea">
              <span className="oi-label">INPUT &rarr;</span>
              <span className="oi-text" id="oi-text"></span>
            </div>
            <button className="back-btn" onClick={() => (window as any).goBack && (window as any).goBack()}>&larr; NEW IDEA</button>
          </div>

          <div className="output-card" id="output-card">
            <span className="bc-bl"></span><span className="bc-br"></span>
            <div className="output-card-head">
              <div className="output-meta">
                <div className="output-model-badge" id="out-badge">CLAUDE</div>
                <span className="output-head-label">ENGINEERED PROMPT</span>
              </div>
              <div>
                <button className="copy-btn" id="copy-btn" onClick={() => (window as any).copyPrompt && (window as any).copyPrompt()}>COPY PROMPT</button>
              </div>
            </div>
            <div className="output-text-wrap">
              <div id="output-text"></div>
            </div>
          </div>

          <div id="technique-section">
            <div className="tech-header">WHY THIS PROMPT WORKS — TECHNIQUES APPLIED</div>
            <div className="tech-grid" id="tech-grid"></div>
          </div>
        </div>

      </div>

      {/* Demo CTA */}
      <div className="demo-cta" id="demo-cta">
        <div className="demo-cta-inner">YOUR TURN &rarr;</div>
      </div>
    </>
  );
}
