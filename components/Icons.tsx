// Registro de ícones SVG inline — zero emoji (regra global Impulso).
// Portado 1:1 do protótipo. Tamanho/cor vêm do CSS do contexto (currentColor).
import type { SVGProps } from "react";

export type IconName =
  | "building" | "moto" | "chart" | "shield" | "check" | "checkThin"
  | "clock" | "pin" | "camera" | "pen" | "play" | "stop" | "refresh"
  | "pkg" | "star" | "upload" | "card" | "car" | "user" | "spinner"
  | "arrow" | "send" | "money" | "list" | "bolt";

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS: Record<IconName, (p: SVGProps<SVGSVGElement>) => React.ReactElement> = {
  building: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
    </svg>
  ),
  moto: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <circle cx="5" cy="17" r="3" />
      <circle cx="19" cy="17" r="3" />
      <path d="M8 17h6l3-5h-3.5l-2-3H7" />
      <path d="M14 7h3" />
    </svg>
  ),
  chart: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <path d="M3 3v18h18" />
      <rect x="7" y="11" width="3" height="6" />
      <rect x="12" y="7" width="3" height="10" />
      <rect x="17" y="13" width="3" height="4" />
    </svg>
  ),
  shield: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={3.2} {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  checkThin: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.4} {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  clock: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  ),
  pin: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  camera: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <path d="M3 7h3l2-2h8l2 2h3v13H3z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  pen: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  ),
  play: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <polygon points="6 4 20 12 6 20" />
    </svg>
  ),
  stop: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  ),
  refresh: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  ),
  pkg: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <path d="M21 16V8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3.3 7L12 12l8.7-5M12 22V12" />
    </svg>
  ),
  star: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9" />
    </svg>
  ),
  upload: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  card: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  car: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <path d="M5 13l2-5h10l2 5M3 13h18v5h-2v-2H5v2H3z" />
      <circle cx="7.5" cy="16.5" r="1" />
      <circle cx="16.5" cy="16.5" r="1" />
    </svg>
  ),
  user: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
    </svg>
  ),
  spinner: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" {...p}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  ),
  arrow: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.4} {...p}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  send: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  money: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.2c0-1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.7-1.1 1.6-2.5 1.6-2.5.7-2.5 1.7 1.1 1.7 2.5 1.7 2.5-.7 2.5-1.7" />
    </svg>
  ),
  list: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3.5" cy="6" r="1" />
      <circle cx="3.5" cy="12" r="1" />
      <circle cx="3.5" cy="18" r="1" />
    </svg>
  ),
  bolt: (p) => (
    <svg viewBox="0 0 24 24" {...stroke} {...p}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10" />
    </svg>
  ),
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return ICONS[name](props);
}
