import { Link, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Mail, RotateCw, User } from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Shop', path: '/' },
  { icon: MessageSquare, label: 'Chat', path: '#' },
  { icon: Mail, label: 'Message', path: '#' },
  { icon: RotateCw, label: 'Spin', path: '#' },
  { icon: User, label: 'Account', path: '/login' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg">
      <div className="flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
