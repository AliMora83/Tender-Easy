import Link from 'next/link';

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Company Profile', href: '/dashboard/profile' },
  { name: 'Tender Analyzer', href: '/dashboard/analyzer' },
  { name: 'Settings', href: '/dashboard/settings' },
];

export default function Sidebar() {
  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-800">
        <span className="text-xl font-bold tracking-tight">Tender Easy</span>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <nav className="flex-1 space-y-1 px-4 py-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="group flex items-center rounded-md px-2 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center text-sm text-gray-400">
          User Settings
        </div>
      </div>
    </div>
  );
}
