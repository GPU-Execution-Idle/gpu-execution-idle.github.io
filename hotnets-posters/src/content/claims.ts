// Single source of truth for both posters: title, claims, subquestions and their answers.
// Each answer is one takeaway and one figure (src/components/Figures.tsx), drawn from ./data.ts
// and ./traces.ts. A question without a figure yet uses `placeholder`.

export const PAPER = {
  venue: 'HotNets 2026',
  title: 'The Network Should Wake the GPU',
  closing: 'Think we’re wrong? Come challenge us.',
  qrLabel: 'Explore the evidence',
};

export type FigureId = 'idle-power' | 'exec-idle' | 'concurrency' | 'agent-trace' | 'reactive' | 'wake-lead' | 'tradeoff';

export type Question = {
  id: string; // deep link: #<claim id>-<question id>, e.g. #c1-q2
  q: string;
  // A takeaway can depend on the figure's current choice (e.g. which setting is selected).
  takeaway: string | ((choice: string) => string);
  figure?: FigureId | { placeholder: string }; // a takeaway-only answer has none
  choice?: string; // the figure's initial choice, when the takeaway depends on it
};

export type Claim = { id: string; n: number; text: string; questions: Question[] };

export const CLAIMS: Claim[] = [
  {
    id: 'c1', n: 1, text: 'We’ve Uncovered a Hidden Cost of GPU Idleness.',
    questions: [
      { id: 'q1', q: 'Does an idle GPU really consume that much power?',
        takeaway: 'Yes. With a program loaded but no work, a GPU draws 7–\u206070\u00a0W above true idle.',
        figure: 'idle-power' },
      { id: 'q2', q: 'How common is execution-idle in real workloads?',
        takeaway: 'We measured it in a university cluster, agentic workloads and serving workloads.',
        figure: 'exec-idle' },
      { id: 'q3', q: 'Why not just keep GPUs busy?',
        takeaway: 'Often there isn’t enough work, as with a personal AI agent. And packing in more isn’t always desirable: extra agent sessions slow each one down.',
        figure: 'concurrency' },
      { id: 'q4', q: 'What does execution-idle look like in an agentic workload?',
        takeaway: 'Agents make tens to hundreds of tool calls, each idling the GPU for under a second to tens of seconds.',
        figure: 'agent-trace' },
    ],
  },
  {
    id: 'c2', n: 2, text: 'Today’s GPUs Are Bad at Waking Up.',
    questions: [
      { id: 'q1', q: 'Why not just lower the GPU’s frequency when it’s idle?',
        takeaway: 'You can, but waking the GPU back up adds latency.',
        figure: 'reactive' },
      { id: 'q2', q: 'How long does it take a GPU to wake up?',
        takeaway: (k) => `Waking ${k === 'smMem' ? '320' : '260'} ms before work starts hides the transition.`,
        figure: 'wake-lead', choice: 'sm' },
    ],
  },
  {
    id: 'c3', n: 3, text: 'GPU Power Management Is Not Just a GPU Problem.',
    questions: [
      { id: 'q1', q: 'Why use network signals to wake the GPU?',
        takeaway: 'The request scheduler (in serving) or the browser (in web agents) knows when work is coming, early enough to wake the GPU and hide the transition.' },
      { id: 'q2', q: 'How does our approach compare with the baseline on energy and latency?',
        takeaway: 'Our approach keeps large energy savings at Default (no scaling) latency.',
        figure: 'tradeoff' },
      { id: 'q3', q: 'Can signals come from other system components?',
        takeaway: 'Yes. Any component that runs just before GPU work can wake it, as long as its remaining time to that work covers the GPU’s wake-up latency.' },
    ],
  },
];

export const questionAnchor = (c: Claim, q: Question) => `${c.id}-${q.id}`;
