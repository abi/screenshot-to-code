interface Props {
  imageUrl: string;
}

function ImageScanningPreview({ imageUrl }: Props) {
  return (
    <div
      className="flex h-full min-h-0 items-center justify-center overflow-hidden bg-slate-50 p-5 dark:bg-zinc-950 sm:p-8"
      data-testid="image-scanning-preview"
    >
      <div className="relative w-full max-w-5xl">
        <div className="absolute -inset-12 rounded-[3rem] bg-violet-400/10 blur-3xl dark:bg-violet-500/10" />
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xl shadow-slate-300/50 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/50">
          <div className="relative max-h-[72vh] overflow-hidden rounded-xl bg-slate-100 dark:bg-zinc-950">
            <img
              src={imageUrl}
              alt="Uploaded screenshot being analyzed"
              className="block max-h-[72vh] w-full object-contain"
            />
            <div className="pointer-events-none absolute inset-0 bg-violet-950/[0.03] dark:bg-violet-300/[0.02]" />
            <div className="scan-sweep pointer-events-none absolute inset-x-0 top-0 h-28">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-400/10 to-violet-500/25" />
              <div className="absolute inset-x-[2%] bottom-0 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent shadow-[0_0_16px_2px_rgba(139,92,246,0.8)]" />
              <div className="absolute inset-x-[18%] bottom-[-1px] h-[3px] rounded-full bg-violet-300/70 blur-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageScanningPreview;
