import { DropIcon, HomeIcon, MaskIcon, PillIcon, PulseIcon, WalkerIcon } from "./auth/Icons";

export default function CategoryIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  if (/diagnos|monitor|pulse|oxi|thermo/.test(n)) return <PulseIcon />;
  if (/diabet|glucose|sugar|insulin/.test(n)) return <DropIcon />;
  if (/ppe|hygiene|mask|glove|sanit/.test(n)) return <MaskIcon />;
  if (/mobil|walker|cane|wheel|support|brace/.test(n)) return <WalkerIcon />;
  if (/home|first|care/.test(n)) return <HomeIcon />;
  return <PillIcon />;
}