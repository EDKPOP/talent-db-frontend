'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

const NAV_ITEMS = [
  { href: '/', label: '대시보드', icon: '📊' },
  { href: '/candidates', label: '지원자 목록', icon: '👥' },
  { href: '/management', label: '합격 후보 관리', icon: '✅' },
];

export function Nav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user || pathname === '/login') return null;

  return (
    <nav className="flex items-center gap-1 bg-white border-b px-6 py-3">
      <Link href="/" className="text-lg font-bold mr-8">
        KEENS Casting DB
      </Link>
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100',
            )}
          >
            <span className="mr-1.5">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-gray-500">{user.email}</span>
        <button
          onClick={logout}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
