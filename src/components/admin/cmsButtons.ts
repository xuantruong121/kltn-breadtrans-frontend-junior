/** Shared button looks for the skill CMS: visible hover, press, keyboard focus and disabled states. */
export const BTN_BASE =
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_SECONDARY = `${BTN_BASE} border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100`;
export const BTN_PRIMARY = `${BTN_BASE} bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800`;
export const BTN_SUCCESS = `${BTN_BASE} bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-900`;
export const BTN_DANGER = `${BTN_BASE} border border-rose-200 bg-white text-rose-600 hover:border-rose-300 hover:bg-rose-50 active:bg-rose-100`;
export const BTN_AI = `${BTN_BASE} border border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100 active:bg-amber-200`;
