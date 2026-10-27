// Activities call notifyProgress() after saving state; the shell's progress bar listens.
export const PROGRESS_EVENT = 'wakegpu:progress';
export const notifyProgress = () => window.dispatchEvent(new Event(PROGRESS_EVENT));
