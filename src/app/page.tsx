"use client";

import { useState, useRef } from "react";
import Link from "next/link";

interface TenderAnalysis {
  metadata: {
    tenderNumber: string | null;
    issuingEntity: string | null;
    closingDate: string | null;
    evaluationBasis: string | null;
  };
  mandatoryReturnables: {
    item: string;
    description: string;
  }[];
}

export default function LandingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TenderAnalysis | null>(null);
  
  // Lead Capture State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      await processFile(selectedFile);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        await processFile(droppedFile);
      } else {
        alert("Please upload a PDF file.");
      }
    }
  };

  const processFile = async (selectedFile: File) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/public-analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const result = await response.json();
      setAnalysisResult(result);
      
      // AI analysis finished! Now gate the results behind the email capture
      setShowEmailModal(true);
      
    } catch (err) {
      console.error(err);
      alert("Something went wrong during analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmittingLead(true);

    try {
      // Save lead to Firestore directly (100% Free)
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      await addDoc(collection(db, 'leads'), {
        email: email,
        tenderExtracted: analysisResult?.metadata.tenderNumber || 'Unknown',
        source: 'landing-page',
        capturedAt: serverTimestamp()
      });

      // Unlock the UI
      setLeadCaptured(true);
      setShowEmailModal(false);
    } catch (err) {
      console.error("Error saving lead:", err);
      // We still unlock the UI even if the save fails so the user isn't stuck
      setLeadCaptured(true);
      setShowEmailModal(false);
    } finally {
      setIsSubmittingLead(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-blue-600 tracking-tight">Tender Easy</span>
            </div>
            <div className="flex space-x-4">
              <Link href="/login" className="text-slate-600 hover:text-slate-900 font-medium px-3 py-2">
                Log in
              </Link>
              <Link href="/register" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
            Eliminate Government Tender Disqualifications.
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-8">
            Upload any South African Request for Tender (RFT) PDF. Our AI instantly extracts every mandatory returnable and compliance requirement so you never miss a document again.
          </p>
        </div>

        {/* The Lead Magnet Dropzone */}
        {!analysisResult && !isAnalyzing && (
          <div className="max-w-2xl mx-auto">
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 group"
            >
              <div className="mx-auto h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Upload RFT Document</h3>
              <p className="text-slate-500 mb-6">Drag and drop your PDF tender document here, or click to browse</p>
              <button className="bg-white border border-slate-300 text-slate-700 px-6 py-2 rounded-lg font-medium shadow-sm hover:bg-slate-50">
                Select PDF File
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="application/pdf" 
                className="hidden" 
              />
            </div>
            <p className="text-center text-sm text-slate-400 mt-4">100% Secure & Confidential. Try it for free.</p>
          </div>
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <div className="max-w-2xl mx-auto text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="inline-block relative w-16 h-16">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-100 rounded-full"></div>
              <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mt-6 mb-2">Analyzing Tender Document...</h3>
            <p className="text-slate-500">Our AI is reading hundreds of pages to extract the mandatory requirements.</p>
          </div>
        )}

        {/* Blurred Results (Behind Email Gate) */}
        {analysisResult && !leadCaptured && (
          <div className="max-w-4xl mx-auto relative">
            <div className="filter blur-md opacity-60 pointer-events-none user-select-none">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
                <h3 className="text-xl font-bold mb-4">Tender Metadata</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Tender Number</p>
                    <p className="font-medium text-slate-900">{analysisResult.metadata.tenderNumber || 'Not found'}</p>
                  </div>
                  {/* ... other blurred data ... */}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unlocked Results! */}
        {analysisResult && leadCaptured && (
          <div className="max-w-4xl mx-auto animate-fade-in-up">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 flex items-start gap-4">
              <div className="bg-green-500 rounded-full p-1 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-green-800">Your Compliance Summary is Unlocked!</h3>
                <p className="text-sm text-green-700 mt-1">We've also emailed you a copy. Want to automate the generation of these documents? <Link href="/register" className="underline font-bold">Create a free account.</Link></p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Tender Metadata</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-slate-500">Tender Number</p>
                  <p className="text-base font-semibold text-slate-900 mt-1">{analysisResult.metadata.tenderNumber || 'Not found'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Issuing Entity</p>
                  <p className="text-base font-semibold text-slate-900 mt-1">{analysisResult.metadata.issuingEntity || 'Not found'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Closing Date</p>
                  <p className="text-base font-semibold text-slate-900 mt-1">{analysisResult.metadata.closingDate || 'Not found'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Evaluation Basis</p>
                  <p className="text-base font-semibold text-slate-900 mt-1">{analysisResult.metadata.evaluationBasis || 'Not found'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">Mandatory Returnables</h2>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{analysisResult.mandatoryReturnables.length} Found</span>
              </div>
              <div className="divide-y divide-slate-100">
                {analysisResult.mandatoryReturnables.map((req, idx) => (
                  <div key={idx} className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                    <div className="mt-0.5 text-blue-500 flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{req.item}</h4>
                      <p className="text-sm text-slate-600 mt-1">{req.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-12 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} Tender Easy. All rights reserved.
          </p>
          <p className="text-slate-500 text-xs mt-4 max-w-3xl mx-auto leading-relaxed">
            <strong>POPIA Compliance & Liability Disclaimer:</strong> Tender Easy automates the extraction and mapping of tender requirements using Artificial Intelligence. While we strive for absolute accuracy, the ultimate responsibility for ensuring bid compliance, correct document submission, and verifying all extracted information rests solely with the user. Tender Easy assumes no strict liability for any direct or indirect bid disqualifications, financial losses, or damages resulting from the use of this platform. By using this platform, you consent to the processing of your data in accordance with the Protection of Personal Information Act (POPIA).
          </p>
        </div>
      </footer>

      {/* The Email Capture Modal */}
      {showEmailModal && !leadCaptured && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Analysis Complete!</h2>
              <p className="text-slate-600 mb-6">We found <span className="font-bold text-slate-900">{analysisResult?.mandatoryReturnables.length} mandatory returnables</span>. Enter your email to unlock your free checklist.</p>
              
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <input
                  type="email"
                  required
                  placeholder="Enter your work email"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={isSubmittingLead}
                  className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {isSubmittingLead ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Unlock My Free Checklist"
                  )}
                </button>
              </form>
              <p className="text-xs text-slate-400 mt-4">We'll never spam you. Unsubscribe at any time.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
