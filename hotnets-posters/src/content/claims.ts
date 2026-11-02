// Single source of truth for both posters: title, claims, subquestions and their answers.
// Each answer is one takeaway and at most one figure. In a takeaway, a blank line starts a new
// paragraph, a paragraph of lines starting with "- " is a bulleted list, and **text** is bold. The figure
// comes from src/components/Figures.tsx, drawn from ./data.ts. A question without a figure yet uses `placeholder`.

export const PAPER = {
  venue: 'HotNets 2026',
  title: 'The Network Should Wake the GPU',
  closing: 'Think we’re wrong? Come challenge us.',
  qrLabel: 'Explore the evidence',
  authors: ['Yiran Lei', 'Jared Fernandez', 'Vasilis Kypriotis', 'Dimitrios Skarlatos', 'Emma Strubell', 'Justine Sherry', 'Daniel Vosler'],
  affiliation: 'Carnegie Mellon University',
};

export type FigureId = 'idle-power' | 'exec-idle' | 'reactive' | 'wake-lead' | 'tradeoff';

export type Question = {
  id: string; // deep link: #<claim id>-<question id>, e.g. #c1-q2
  q: string;
  // A takeaway can depend on the figure's current choice (e.g. which setting is selected).
  takeaway: string | ((choice: string) => string);
  figure?: FigureId | { placeholder: string }; // a takeaway-only answer has none
  choice?: string; // the figure's initial choice, when the takeaway depends on it
  // The full paper poster's version, where it differs: an empty takeaway leaves only the figure.
  poster?: { takeaway?: string; figure?: FigureId | 'net-signals' };
};

// `part` titles the claim's section on the web poster; `text` is the claim as the paper poster states it.
// `posterPart`, where set, titles the section on the full paper poster instead of `part`.
export type Claim = { id: string; n: number; part: string; text: string; posterPart?: string; questions: Question[] };

export const CLAIMS: Claim[] = [
  {
    id: 'c1', n: 1, part: 'The Hidden Energy Problem', text: 'We’ve Uncovered a Hidden Cost of GPU Idleness.',
    questions: [
      { id: 'q1', q: 'What is the hidden energy problem with GPUs?',
        takeaway: 'GPUs can waste energy even when doing no useful work. When a program remains loaded but the GPU is not computing—a state we call execution-idle—the GPU can draw 30–\u206070\u00a0W more than when truly idle.',
        figure: 'idle-power',
        poster: { takeaway: 'When a program remains loaded but the GPU has zero activity—a state we call execution-idle—it can draw 30–\u206070\u00a0W more than when truly idle.' } },
      { id: 'q2', q: 'How common is execution-idle in real workloads?',
        takeaway: 'We measured it in serving and agentic workloads.',
        figure: 'exec-idle', poster: { takeaway: '' } },
    ],
  },
  {
    id: 'c2', n: 2, part: 'The Challenge of GPU Power Management', text: 'Today’s GPUs Are Bad at Waking Up.', posterPart: 'Today’s GPUs Are Bad at Waking Up',
    questions: [
      { id: 'q1', q: 'Why not just lower the GPU’s frequency when it’s idle?',
        takeaway: 'You can, but waking the GPU back up adds latency.',
        figure: 'reactive', poster: { takeaway: '' } },
      { id: 'q2', q: 'How long does it take a GPU to wake up?',
        takeaway: (k) => `Waking ${k === 'smMem' ? '320' : '260'} ms before work starts hides the transition.`,
        figure: 'wake-lead', choice: 'sm',
        poster: { takeaway: '' } },
    ],
  },
  {
    id: 'c3', n: 3, part: 'The Case for Network-Aware Control', text: 'GPU Power Management Is Not Just a GPU Problem.',
    questions: [
      { id: 'q1', q: 'Why use network signals to wake the GPU?',
        takeaway: 'GPU work is often triggered by external events, such as incoming inference requests or responses from remote services. These events can be visible to the network and host before computation reaches the GPU.\n\n'
          + 'There are two opportunities:\n\n'
          + '- **Network observations reveal current demand.** Incoming requests or responses can trigger GPU wakeup before work is submitted.\n'
          + '- **Network predictions anticipate future demand.** Request-arrival patterns or predicted response completion can provide an even earlier warning, helping hide slow GPU frequency recovery.\n\n'
          + 'GPU power management should leverage both observations and predictions of network activity, rather than reacting only to GPU activity.',
        poster: {
          takeaway: 'GPU work is often triggered by external events.\n\n'
            + '- **Observations** of network activity reveal current demand.\n'
            + '- **Predictions** of network activity anticipate future demand.',
          figure: 'net-signals',
        } },
      { id: 'q2', q: 'Can network-aware control save energy without hurting latency?',
        takeaway: 'Our approach keeps large energy savings at Default (no scaling) latency.',
        figure: 'tradeoff', poster: { takeaway: '' } },
    ],
  },
];

export const questionAnchor = (c: Claim, q: Question) => `${c.id}-${q.id}`;
