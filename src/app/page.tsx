import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-white text-black">
      <h1 className="text-4xl font-bold mb-8">Welcome to Tender Easy</h1>
      <p className="text-lg mb-8 text-gray-600">Automated tender document processing and compliance platform.</p>
      <Link href="/dashboard" className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
        Go to Dashboard
      </Link>
    </div>
  );
}
