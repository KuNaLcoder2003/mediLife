const p = {
  width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};

export const PlusIcon = () => (
  <svg {...p} width={22} height={22} strokeWidth={3}><path d="M12 5v14M5 12h14" /></svg>
);
export const ShieldIcon = () => (
  <svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const DocIcon = () => (
  <svg {...p}><path d="M6 3h9l3 3v15H6z" /><path d="M9 11h6M9 15h6" /></svg>
);
export const LockIcon = () => (
  <svg {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
);
export const RefreshIcon = () => (
  <svg {...p}><path d="M4 12a8 8 0 108-8" /><path d="M4 4v5h5" /></svg>
);
export const GoogleIcon = () => (
  <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 12h8" /></svg>
);
export const InfoIcon = () => (
  <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
);

export const BackIcon = () => (
  <svg {...p}><path d="M15 6l-6 6 6 6" /></svg>
);
export const CheckIcon = () => (
  <svg {...p} strokeWidth={2.4}><path d="M5 12l5 5 9-10" /></svg>
);
export const CircleIcon = () => (
  <svg {...p}><circle cx="12" cy="12" r="7" /></svg>
);
export const AlertIcon = () => (
  <svg {...p} width={16} height={16}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
);
export const EyeIcon = () => (
  <svg {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);