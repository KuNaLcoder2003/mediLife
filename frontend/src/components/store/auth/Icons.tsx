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

export const MailIcon = () => (
  <svg {...p} width={28} height={28}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
);

// Admin panel Icons
export const GridIcon = () => (<svg {...p}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>);
export const BoxIcon = () => (<svg {...p}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /></svg>);
export const TagIcon = () => (<svg {...p}><path d="M3 12V4h8l10 10-8 8L3 12z" /><circle cx="7.5" cy="8.5" r="1" /></svg>);
export const ClipboardIcon = () => (<svg {...p}><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v3H9z" /></svg>);
export const UsersIcon = () => (<svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M18 14a6.5 6.5 0 013.5 6" /></svg>);
export const ChartIcon = () => (<svg {...p}><path d="M4 20V4M4 20h16M9 20v-6M14 20V9M19 20v-9" /></svg>);
export const SlidersIcon = () => (<svg {...p}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>);
export const ExternalIcon = () => (<svg {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></svg>);
export const SearchIcon = () => (<svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>);
export const BellIcon = () => (<svg {...p}><path d="M6 16v-5a6 6 0 0112 0v5l2 2H4l2-2z" /><path d="M10 21h4" /></svg>);
export const DollarIcon = () => (
  <svg {...p}><path d="M12 3v2M12 19v2M16 8c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.8 2.5 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3" /></svg>
);
export const TriangleIcon = () => (<svg {...p}><path d="M12 4l9 16H3L12 4z" /><path d="M12 10v4M12 17h.01" /></svg>);
export const UploadIcon = () => (<svg {...p} width={22} height={22}><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>);
export const TrashIcon = () => (<svg {...p} width={16} height={16}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>);
export const GripIcon = () => (<svg {...p} fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" /><circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" /><circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" /></svg>);

export const ImageIcon = () => (<svg {...p} width={20} height={20}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></svg>);
export const PencilIcon = () => (<svg {...p} width={16} height={16}><path d="M4 20l1-4L16 5l3 3L8 19l-4 1z" /><path d="M14 7l3 3" /></svg>);
export const DotsIcon = () => (<svg {...p} width={16} height={16} fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>);
export const DownloadIcon = () => (<svg {...p}><path d="M12 4v11M7 11l5 5 5-5M4 20h16" /></svg>);
export const NextIcon = () => (<svg {...p}><path d="M9 6l6 6-6 6" /></svg>);

  export const PrinterIcon = () => (<svg {...p}><path d="M7 9V4h10v5M7 17H5a1 1 0 01-1-1v-5a2 2 0 012-2h12a2 2 0 012 2v5a1 1 0 01-1 1h-2M7 14h10v6H7z" /></svg>);