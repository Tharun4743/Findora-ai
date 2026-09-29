import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(true); // Default to sleek obsidian dark

  useEffect(() => {
    const saved = localStorage.getItem('app_theme');
    const activeDark = saved ? saved === 'dark' : false; // Default light
    setIsDark(activeDark);
    document.documentElement.classList.toggle('dark', activeDark);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('app_theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-[#1a1a20] hover:bg-zinc-200 dark:hover:bg-[#26262e] border border-zinc-200 dark:border-[#26262e] transition-all cursor-pointer active:scale-95"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-amber-500" />}
    </button>
  );
};

export default ThemeToggle;
