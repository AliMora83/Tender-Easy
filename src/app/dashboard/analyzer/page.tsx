"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

interface TenderAnalysis {
  metadata: {
    tenderNumber: string | null;
    issuingEntity: string | null;
    closingDate: string | null;
    evaluationBasis: string | null;
  };
  mandatoryReturnables: Array<{
    item: string;
    description: string;
  }>;
}

export default function AnalyzerPage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [analysisResult, setAnalysisResult] = useState<TenderAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load user profile to check compliance against extracted checklist
  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        setProfileData(docSnap.data());
      }
    }
    fetchProfile();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setAnalysisResult(null);
      setError(null);
      setUploadProgress(0);
    }
  };

  const processTender = async () => {
    if (!file || !user) return;
    
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      const tenderId = `TENDER_${Date.now()}`;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenderId', tenderId);

      // Simulate some progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 300);

      // Upload directly from the client to avoid server-side Node.js fetch hangs
      // and unauthenticated Firebase Storage issues.
      const storageRef = ref(storage, `users/${user.uid}/tenders/${tenderId}/rft.pdf`);
      
      const snapshot = await uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'application/pdf',
      });
      
      const downloadUrl = await getDownloadURL(snapshot.ref);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setIsUploading(false);
      setIsAnalyzing(true);

      const response = await fetch('/api/analyze-tender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadUrl })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze tender');
      }

      const result: TenderAnalysis = await response.json();
      setAnalysisResult(result);

      // Save the result to Firestore
      await setDoc(doc(db, "users", user.uid, "tenders", tenderId), {
        ...result,
        rftFileUrl: downloadUrl,
        fileName: file.name,
        analyzedAt: new Date().toISOString()
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred during processing.');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const checkCompliance = (item: string) => {
    if (!profileData) return 'unknown';
    const lowerItem = item.toLowerCase();
    
    if (lowerItem.includes('sbd 1') || lowerItem.includes('sbd1')) return 'ready';
    if (lowerItem.includes('sbd 4') || lowerItem.includes('sbd4')) return 'ready';
    if (lowerItem.includes('sbd 6.1') || lowerItem.includes('sbd6.1')) return 'ready';
    
    if (lowerItem.includes('tax') || lowerItem.includes('sars')) {
      return profileData.taxCertificateUrl ? 'ready' : 'missing';
    }
    
    if (lowerItem.includes('bee') || lowerItem.includes('b-bbee')) {
      return profileData.bbbeeCertificateUrl ? 'ready' : 'missing';
    }
    
    if (lowerItem.includes('csd') || lowerItem.includes('central supplier')) {
      return profileData.csdNumber ? 'ready' : 'missing';
    }
    
    return 'manual';
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Tender Analyzer</h1>
        <p className="text-slate-500 mt-1">Upload a Request for Tender (RFT) PDF to automatically extract requirements using Vertex AI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Upload RFT Document</h2>
            
            <label className={`mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer text-center ${file ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
              <input type="file" className="sr-only" accept=".pdf" onChange={handleFileChange} />
              <div className="space-y-2">
                <svg className={`mx-auto h-12 w-12 ${file ? 'text-blue-500' : 'text-slate-400'}`} stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {file ? (
                  <p className="text-sm font-medium text-blue-700 break-words">{file.name}</p>
                ) : (
                  <>
                    <div className="text-sm text-slate-600">
                      <span className="font-medium text-blue-600">Upload a PDF</span> or drag and drop
                    </div>
                    <p className="text-xs text-slate-500">Official South African RFTs only</p>
                  </>
                )}
              </div>
            </label>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {error}
              </div>
            )}

            <button
              onClick={processTender}
              disabled={!file || isUploading || isAnalyzing}
              className="mt-6 w-full flex items-center justify-center bg-blue-600 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-500/20 disabled:opacity-70"
            >
              {isUploading ? `Uploading (${Math.round(uploadProgress)}%)...` : isAnalyzing ? "Analyzing with AI..." : "Extract Requirements"}
            </button>
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-2 space-y-6">
          {analysisResult ? (
            <>
              {/* Metadata Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-800">Tender Metadata</h2>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Tender Number</p>
                    <p className="font-medium text-slate-900 mt-1">{analysisResult.metadata.tenderNumber || "Not found"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Issuing Entity</p>
                    <p className="font-medium text-slate-900 mt-1">{analysisResult.metadata.issuingEntity || "Not found"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Closing Date</p>
                    <p className="font-medium text-slate-900 mt-1">{analysisResult.metadata.closingDate || "Not found"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Evaluation Basis</p>
                    <p className="font-medium text-slate-900 mt-1">{analysisResult.metadata.evaluationBasis || "Not found"}</p>
                  </div>
                </div>
              </div>

              {/* Checklist Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-800">Mandatory Returnables</h2>
                </div>
                <div className="p-0">
                  <ul className="divide-y divide-slate-200">
                    {analysisResult.mandatoryReturnables.map((item, idx) => {
                      const compliance = checkCompliance(item.item);
                      return (
                        <li key={idx} className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                          <div className="mt-0.5">
                            {compliance === 'ready' && (
                              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            )}
                            {compliance === 'missing' && (
                              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            )}
                            {compliance === 'manual' && (
                              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{item.item}</p>
                            <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                          </div>
                          <div>
                            {compliance === 'ready' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Vault Ready</span>}
                            {compliance === 'missing' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Missing from Vault</span>}
                            {compliance === 'manual' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Manual Check</span>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6 text-center">
              {isAnalyzing ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl animate-pulse"></div>
                    <svg className="relative h-16 w-16 text-blue-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <h3 className="mt-6 text-lg font-medium text-slate-900">Vertex AI is analyzing the document...</h3>
                  <p className="mt-2 text-sm text-slate-500 max-w-sm">Extracting mandatory returnables, metadata, and cross-referencing your compliance vault.</p>
                </>
              ) : (
                <>
                  <svg className="h-16 w-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-slate-500 text-sm max-w-xs">Upload an RFT document to view extracted requirements and compliance status.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
