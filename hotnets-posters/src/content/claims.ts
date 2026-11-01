// Single source of truth for both posters: title, claims, subquestions and their answers.
// Each answer is one takeaway (paragraphs separated by a blank line) and at most one figure
// (src/components/Figures.tsx), drawn from ./data.ts. A question without a figure yet uses `placeholder`.

export const PAPER = {
  venue: 'HotNets 2026',
  title: 'The Network Should Wake the GPU',
  closing: 'Think we’re wrong? Come challenge us.',
  qrLabel: 'Explore the evidence',
};

export type FigureId = 'idle-power' | 'exec-idle' | 'reactive' | 'wake-lead' | 'tradeoff';

export type Question = {
  id: string; // deep link: #<claim id>-<question id>, e.g. #c1-q2
  q: string;
  // A takeaway can depend on the figure's current choice (e.g. which setting is selected).
  takeaway: string | ((choice: string) => string);
  figure?: FigureId | { placeholder: string }; // a takeaway-only answer has none
  choice?: string; // the figure's initial choice, when the takeaway depends on it
};

// `part` titles the claim's section on the web poster; `text` is the claim as the paper poster states it.
export type Claim = { id: string; n: number; part: string; text: string; questions: Question[] };

export const CLAIMS: Claim[] = [
  {
    id: 'c1', n: 1, part: 'The Hidden Energy Problem', text: 'We’ve Uncovered a Hidden Cost of GPU Idleness.',
    questions: [
      { id: 'q1', q: 'What is the hidden energy problem with GPUs?',
        takeaway: 'GPUs can waste energy even when doing no useful work. When a program remains loaded but the GPU is not computing—a state we call execution-idle—the GPU can draw 30–\u206070\u00a0W more than when truly idle.',
        figure: 'idle-power' },
      { id: 'q2', q: 'How common is execution-idle in real workloads?',
        takeaway: 'We measured it in serving and agentic workloads.',
        figure: 'exec-idle' },
    ],
  },
  {
    id: 'c2', n: 2, part: 'The Challenge of GPU Power Management', text: 'Today’s GPUs Are Bad at Waking Up.',
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
    id: 'c3', n: 3, part: 'The Case for Network-Aware Control', text: 'GPU Power Management Is Not Just a GPU Problem.',
    questions: [
      { id: 'q1', q: 'Why use network signals to wake the GPU?',
        takeaway: 'GPU work is often triggered by external events, such as incoming inference requests or browser responses. These events can become visible to the request scheduler, network stack, or browser before the GPU receives work.\n\n'
          + 'By observing network traffic or predicting when responses will arrive, the system can anticipate GPU demand and initiate wakeup early—potentially hiding hundreds of milliseconds of frequency recovery without delaying inference.' },
      { id: 'q2', q: 'Can network-aware control save energy without hurting latency?',
        takeaway: 'Our approach keeps large energy savings at Default (no scaling) latency.',
        figure: 'tradeoff' },
    ],
  },
];

export const questionAnchor = (c: Claim, q: Question) => `${c.id}-${q.id}`;
