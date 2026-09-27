"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";

interface ExpiryItem {
  id: string;
  name: string;
  expiryDate: string | null;
  status: 'valid' | 'expiring-soon' | 'expired' | 'missing';
  daysRemaining: number | null;
  updateLink: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expiryItems, setExpiryItems] = useState<ExpiryItem[]>([]);

  useEffect(() => {
    async function fetchProfileData() {
      if (!user) return;
      
      try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        
        const data = docSnap.exists() ? docSnap.data() : {};
        
        // Helper function to calculate status
        const calculateStatus = (dateString?: string): { status: ExpiryItem['status'], daysRemaining: number | null } => {
          if (!dateString) return { status: 'missing', daysRemaining: null };
          
          const expiry = new Date(dateString);
          const today = new Date();
          // Reset time to midnight for accurate day comparison
          today.setHours(0, 0, 0, 0);
          expiry.setHours(0, 0, 0, 0);
          
          const diffTime = expiry.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0) return { status: 'expired', daysRemaining: diffDays };
          if (diffDays <= 30) return { status: 'expiring-soon', daysRemaining: diffDays };
          return { status: 'valid', daysRemaining: diffDays };
        };

        const taxStatus = calculateStatus(data.pinExpiry);
        const bbbeeStatus = calculateStatus(data.bbbeeExpiryDate);
        const coidaStatus = calculateStatus(data.coidaExpiryDate); // May be undefined, which returns 'missing'

        setExpiryItems([
          {
            id: 'tax',
            name: 'SARS Tax Clearance (PIN)',
            expiryDate: data.pinExpiry || null,
            status: taxStatus.status,
            daysRemaining: taxStatus.daysRemaining,
            updateLink: '/dashboard/profile'
          },
          {
            id: 'bbbee',
            name: 'B-BBEE Certificate / Affidavit',
            expiryDate: data.bbbeeExpiryDate || null,
            status: bbbeeStatus.status,
            daysRemaining: bbbeeStatus.daysRemaining,
            updateLink: '/dashboard/profile'
          },
          {
            id: 'coida',
            name: 'COIDA Letter of Good Standing',
            expiryDate: data.coidaExpiryDate || null,
            status: coidaStatus.status,
            daysRemaining: coidaStatus.daysRemaining,
            updateLink: '/dashboard/profile' // We will add COIDA to the profile page later
          }
        ]);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfileData();
  }, [user]);

  const getStatusBadge = (status: ExpiryItem['status']) => {
    switch (status) {
      case 'valid':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Valid</span>;
      case 'expiring-soon':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">Expiring Soon</span>;
      case 'expired':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Expired</span>;
      case 'missing':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Missing</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // Count items needing attention
  const actionRequiredCount = expiryItems.filter(item => item.status !== 'valid').length;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Monitor your compliance health and upcoming document expirations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${actionRequiredCount === 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <svg className={`w-6 h-6 ${actionRequiredCount === 0 ? 'text-green-600' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Compliance Status</p>
              <p className="text-xl font-bold text-slate-900">{actionRequiredCount === 0 ? '100% Ready' : 'Action Required'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Tracked Documents</p>
              <p className="text-xl font-bold text-slate-900">{expiryItems.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Expiring &lt; 30 Days</p>
              <p className="text-xl font-bold text-slate-900">{expiryItems.filter(i => i.status === 'expiring-soon' || i.status === 'expired').length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-base font-semibold text-slate-800">Document Expiry Tracker</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-white">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Document Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expiry Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time Remaining</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {expiryItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{item.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500">
                      {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-ZA') : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500">
                      {item.status === 'missing' ? '-' : 
                       item.status === 'expired' ? <span className="text-red-600 font-medium">Expired by {Math.abs(item.daysRemaining!)} days</span> : 
                       item.daysRemaining === 0 ? <span className="text-yellow-600 font-medium">Expires today</span> :
                       <span className={item.daysRemaining! <= 30 ? "text-yellow-600 font-medium" : ""}>{item.daysRemaining} days</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={item.updateLink} className="text-blue-600 hover:text-blue-900 flex items-center justify-end gap-1">
                      {item.status === 'missing' ? 'Upload' : 'Update'}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
