import React, { type ReactNode, type HTMLAttributes, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  color?: 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose' | 'purple';
  subtitle?: string;
}

export function StatCard({ title, value, icon, color = 'blue', subtitle }: StatCardProps) {
  const colorMap = {
    blue: { bg: 'bg-blue-600', border: 'border-blue-100 dark:border-blue-900/30' },
    emerald: { bg: 'bg-emerald-600', border: 'border-emerald-100 dark:border-emerald-900/30' },
    amber: { bg: 'bg-amber-500', border: 'border-amber-100 dark:border-amber-900/30' },
    indigo: { bg: 'bg-indigo-600', border: 'border-indigo-100 dark:border-indigo-900/30' },
    rose: { bg: 'bg-rose-600', border: 'border-rose-100 dark:border-rose-900/30' },
    purple: { bg: 'bg-purple-600', border: 'border-purple-100 dark:border-purple-900/30' },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className={cn(
      "relative overflow-hidden p-4 sm:p-5 border shadow-xs hover:shadow-md transition-all bg-white dark:bg-[#141418] rounded-2xl",
      scheme.border
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-zinc-400 dark:text-zinc-500">{subtitle}</p>}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0", scheme.bg)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
}

export const Card = ({ children, className, ...props }: CardProps) => (
  <div className={cn('bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] rounded-2xl p-5 sm:p-6 shadow-xs', className)} {...props}>
    {children}
  </div>
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
}

export const Button = ({
  className,
  variant = 'primary',
  ...props
}: ButtonProps) => {
  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-xs',
    secondary: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700',
    ghost: 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
  };

  return (
    <button
      className={cn(
        'h-10 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = ({ className, ...props }: InputProps) => (
  <input
    className={cn(
      'w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-[#2e2e38] focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-900 dark:focus:border-zinc-500 transition-all text-xs sm:text-sm bg-white dark:bg-[#141418] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
      className
    )}
    {...props}
  />
);

export interface BadgeProps {
  children?: ReactNode;
  variant?: 'emerald' | 'amber' | 'blue' | 'rose' | 'zinc';
  className?: string;
}

export const Badge = ({
  children,
  variant = 'emerald',
  className
}: BadgeProps) => {
  const badgeStyles = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-[#4ade80] dark:border-emerald-500/40',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-[#fde047] dark:border-amber-500/40',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-sky-500/15 dark:text-[#38bdf8] dark:border-sky-500/35',
    rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-[#fb7185] dark:border-rose-500/40',
    zinc: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  };

  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1.5', badgeStyles[variant] || badgeStyles.emerald, className)}>
      {children}
    </span>
  );
};
