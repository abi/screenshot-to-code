function WorkingPulse() {
  return (
    <span className="inline-flex items-end gap-0.5" aria-hidden="true">
      <span className="h-1.5 w-1.5 rounded-full bg-sky-500/90 dark:bg-sky-400/90 animate-bounce [animation-duration:900ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-sky-500/80 dark:bg-sky-400/80 animate-bounce [animation-duration:900ms] [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-sky-500/70 dark:bg-sky-400/70 animate-bounce [animation-duration:900ms] [animation-delay:300ms]" />
    </span>
  );
}

export default WorkingPulse;
