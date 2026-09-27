"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface Director {
  id: string;
  name: string;
  idNumber: string;
  role: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form State
  const [csdNumber, setCsdNumber] = useState("");
  const [legalName, setLegalName] = useState("");
  const [cipcNumber, setCipcNumber] = useState("");

  const [sarsTaxNumber, setSarsTaxNumber] = useState("");
  const [tcsPin, setTcsPin] = useState("");
  const [pinExpiry, setPinExpiry] = useState("");

  const [bbbeeLevel, setBbbeeLevel] = useState("Level 1");
  const [blackOwnership, setBlackOwnership] = useState("");
  const [blackWomenOwnership, setBlackWomenOwnership] = useState("");
  const [bbbeeIssueDate, setBbbeeIssueDate] = useState("");
  const [bbbeeExpiryDate, setBbbeeExpiryDate] = useState("");

  const [directors, setDirectors] = useState<Director[]>([]);

  // File Upload States
  const [taxCertificateFile, setTaxCertificateFile] = useState<File | null>(null);
  const [taxCertificateUrl, setTaxCertificateUrl] = useState<string>("");
  const [uploadingTax, setUploadingTax] = useState(false);

  const [bbbeeCertificateFile, setBbbeeCertificateFile] = useState<File | null>(null);
  const [bbbeeCertificateUrl, setBbbeeCertificateUrl] = useState<string>("");
  const [uploadingBbbee, setUploadingBbbee] = useState(false);

  const [generatingPdfSbd1, setGeneratingPdfSbd1] = useState(false);
  const [generatingPdfSbd4, setGeneratingPdfSbd4] = useState(false);
  const [generatingPdfSbd61, setGeneratingPdfSbd61] = useState(false);

  const getProfileDataForPdf = () => ({
    legalName,
    csdNumber,
    sarsTaxNumber,
    tcsPin,
    bbbeeLevel,
    blackOwnership,
    blackWomenOwnership,
    directors
  });

  const downloadBlob = (pdfBytes: Uint8Array, filename: string) => {
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGeneratePdfSbd1 = async () => {
    setGeneratingPdfSbd1(true);
    try {
      const { generateSbd1Pdf } = await import("@/utils/fillSbd1");
      const pdfBytes = await generateSbd1Pdf(getProfileDataForPdf());
      downloadBlob(pdfBytes, `SBD1_${legalName || "Template"}.pdf`);
    } catch (error) {
      console.error("Error generating SBD 1:", error);
      alert("Failed to generate SBD 1. Make sure the template exists in public/templates/sbd1.pdf");
    } finally {
      setGeneratingPdfSbd1(false);
    }
  };

  const handleGeneratePdfSbd4 = async () => {
    setGeneratingPdfSbd4(true);
    try {
      const { generateSbd4Pdf } = await import("@/utils/fillSbd4");
      const pdfBytes = await generateSbd4Pdf(getProfileDataForPdf());
      downloadBlob(pdfBytes, `SBD4_${legalName || "Template"}.pdf`);
    } catch (error) {
      console.error("Error generating SBD 4:", error);
      alert("Failed to generate SBD 4. Make sure the template exists in public/templates/sbd4.pdf");
    } finally {
      setGeneratingPdfSbd4(false);
    }
  };

  const handleGeneratePdfSbd61 = async () => {
    setGeneratingPdfSbd61(true);
    try {
      const { generateSbd61Pdf } = await import("@/utils/fillSbd61");
      const pdfBytes = await generateSbd61Pdf(getProfileDataForPdf());
      downloadBlob(pdfBytes, `SBD6.1_${legalName || "Template"}.pdf`);
    } catch (error) {
      console.error("Error generating SBD 6.1:", error);
      alert("Failed to generate SBD 6.1. Make sure the template exists in public/templates/sbd61.pdf");
    } finally {
      setGeneratingPdfSbd61(false);
    }
  };

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCsdNumber(data.csdNumber || "");
          setLegalName(data.legalName || "");
          setCipcNumber(data.cipcNumber || "");
          
          setSarsTaxNumber(data.sarsTaxNumber || "");
          setTcsPin(data.tcsPin || "");
          setPinExpiry(data.pinExpiry || "");
          
          setBbbeeLevel(data.bbbeeLevel || "Level 1");
          setBlackOwnership(data.blackOwnership || "");
          setBlackWomenOwnership(data.blackWomenOwnership || "");
          setBbbeeIssueDate(data.bbbeeIssueDate || "");
          setBbbeeExpiryDate(data.bbbeeExpiryDate || "");
          
          setDirectors(data.directors || []);
          
          setTaxCertificateUrl(data.taxCertificateUrl || "");
          setBbbeeCertificateUrl(data.bbbeeCertificateUrl || "");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, [user]);

  const handleFileUpload = async (file: File, type: 'tax' | 'bbbee') => {
    if (!user) return;
    
    if (type === 'tax') setUploadingTax(true);
    else setUploadingBbbee(true);

    try {
      const storageRef = ref(storage, `users/${user.uid}/certificates/${type}_${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      if (type === 'tax') {
        setTaxCertificateFile(file);
        setTaxCertificateUrl(url);
      } else {
        setBbbeeCertificateFile(file);
        setBbbeeCertificateUrl(url);
      }
    } catch (err) {
      console.error(`Error uploading ${type} certificate:`, err);
      alert(`Failed to upload ${type === 'tax' ? 'Tax' : 'B-BBEE'} certificate. Please try again.`);
    } finally {
      if (type === 'tax') setUploadingTax(false);
      else setUploadingBbbee(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    
    try {
      const docRef = doc(db, "users", user.uid);
      await setDoc(docRef, {
        csdNumber,
        legalName,
        cipcNumber,
        sarsTaxNumber,
        tcsPin,
        pinExpiry,
        bbbeeLevel,
        blackOwnership,
        blackWomenOwnership,
        bbbeeIssueDate,
        bbbeeExpiryDate,
        directors,
        taxCertificateUrl,
        bbbeeCertificateUrl
      }, { merge: true });
      
      setMessage({ type: 'success', text: 'Profile saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const addDirector = () => {
    setDirectors([...directors, { id: Date.now().toString(), name: "", idNumber: "", role: "" }]);
  };

  const updateDirector = (id: string, field: keyof Director, value: string) => {
    setDirectors(directors.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const removeDirector = (id: string) => {
    setDirectors(directors.filter(d => d.id !== id));
  };

  const inputClassName = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Profile</h1>
          <p className="text-slate-500 mt-1">Manage your centralized supplier vault and compliance details.</p>
        </div>
        {message && (
          <div className={`px-4 py-2 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={handleGeneratePdfSbd1}
            disabled={generatingPdfSbd1}
            className="flex items-center justify-center bg-slate-800 text-white font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors focus:ring-4 focus:ring-slate-500/20 disabled:opacity-70"
          >
            {generatingPdfSbd1 ? "Generating..." : "Download SBD 1"}
          </button>
          <button
            onClick={handleGeneratePdfSbd4}
            disabled={generatingPdfSbd4}
            className="flex items-center justify-center bg-slate-800 text-white font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors focus:ring-4 focus:ring-slate-500/20 disabled:opacity-70"
          >
            {generatingPdfSbd4 ? "Generating..." : "Download SBD 4 (Declaration)"}
          </button>
          <button
            onClick={handleGeneratePdfSbd61}
            disabled={generatingPdfSbd61}
            className="flex items-center justify-center bg-slate-800 text-white font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors focus:ring-4 focus:ring-slate-500/20 disabled:opacity-70"
          >
            {generatingPdfSbd61 ? "Generating..." : "Download SBD 6.1 (Preference Points)"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* CSD Registration Section */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Central Supplier Database (CSD)</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Legal Entity Name</label>
              <input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} className={inputClassName} placeholder="e.g. Tender Easy Pty Ltd" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CSD Supplier Number</label>
              <input type="text" value={csdNumber} onChange={(e) => setCsdNumber(e.target.value)} className={inputClassName} placeholder="MAAA..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CIPC Registration Number</label>
              <input type="text" value={cipcNumber} onChange={(e) => setCipcNumber(e.target.value)} className={inputClassName} placeholder="YYYY/NNNNNN/NN" />
            </div>
          </div>
        </section>

        {/* Tax Compliance Section */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Tax Compliance Status (SARS)</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SARS Tax Reference Number</label>
              <input type="text" value={sarsTaxNumber} onChange={(e) => setSarsTaxNumber(e.target.value)} className={inputClassName} placeholder="Tax Number" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">TCS Verification PIN</label>
              <input type="text" value={tcsPin} onChange={(e) => setTcsPin(e.target.value)} className={inputClassName} placeholder="Verification PIN" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PIN Expiry Date</label>
              <input type="date" value={pinExpiry} onChange={(e) => setPinExpiry(e.target.value)} className={inputClassName} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Tax Clearance Certificate</label>
              <label className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                <input type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'tax'); }} />
                <div className="space-y-1 text-center">
                  {uploadingTax ? (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                      <p className="text-sm text-slate-600 font-medium">Uploading...</p>
                    </div>
                  ) : taxCertificateUrl ? (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <svg className="mx-auto h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      <p className="text-sm text-green-600 font-medium">{taxCertificateFile?.name || "File uploaded successfully"}</p>
                      <p className="text-xs text-blue-600 hover:underline">Click to change file</p>
                    </div>
                  ) : (
                    <>
                      <svg className="mx-auto h-12 w-12 text-slate-400 group-hover:text-blue-500 transition-colors" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-slate-600 justify-center">
                        <span className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">Upload a file</span>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-slate-500">PDF, PNG, JPG up to 10MB</p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* B-BBEE Status Section */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">B-BBEE Status</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contributor Level</label>
              <select value={bbbeeLevel} onChange={(e) => setBbbeeLevel(e.target.value)} className={inputClassName}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(level => (
                  <option key={level} value={`Level ${level}`}>Level {level}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Black Ownership %</label>
              <input type="number" min="0" max="100" value={blackOwnership} onChange={(e) => setBlackOwnership(e.target.value)} className={inputClassName} placeholder="e.g. 51" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Black Women Ownership %</label>
              <input type="number" min="0" max="100" value={blackWomenOwnership} onChange={(e) => setBlackWomenOwnership(e.target.value)} className={inputClassName} placeholder="e.g. 30" />
            </div>
            <div></div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date</label>
              <input type="date" value={bbbeeIssueDate} onChange={(e) => setBbbeeIssueDate(e.target.value)} className={inputClassName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
              <input type="date" value={bbbeeExpiryDate} onChange={(e) => setBbbeeExpiryDate(e.target.value)} className={inputClassName} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">B-BBEE Certificate / Affidavit</label>
              <label className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                <input type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'bbbee'); }} />
                <div className="space-y-1 text-center">
                  {uploadingBbbee ? (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                      <p className="text-sm text-slate-600 font-medium">Uploading...</p>
                    </div>
                  ) : bbbeeCertificateUrl ? (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <svg className="mx-auto h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      <p className="text-sm text-green-600 font-medium">{bbbeeCertificateFile?.name || "File uploaded successfully"}</p>
                      <p className="text-xs text-blue-600 hover:underline">Click to change file</p>
                    </div>
                  ) : (
                    <>
                      <svg className="mx-auto h-12 w-12 text-slate-400 group-hover:text-blue-500 transition-colors" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-slate-600 justify-center">
                        <span className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">Upload a file</span>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-slate-500">PDF, PNG, JPG up to 10MB</p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* Directors Section */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">Director & Beneficial Ownership</h2>
            <button type="button" onClick={addDirector} className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100 transition-colors">
              + Add Director
            </button>
          </div>
          <div className="p-6 space-y-4">
            {directors.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                No directors added yet. Click "+ Add Director" to add one.
              </div>
            ) : (
              directors.map((director) => (
                <div key={director.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                    <input type="text" value={director.name} onChange={(e) => updateDirector(director.id, 'name', e.target.value)} className={inputClassName} placeholder="Name" />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1">ID / Passport Number</label>
                    <input type="text" value={director.idNumber} onChange={(e) => updateDirector(director.id, 'idNumber', e.target.value)} className={inputClassName} placeholder="ID Number" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Equity / Role</label>
                    <input type="text" value={director.role} onChange={(e) => updateDirector(director.id, 'role', e.target.value)} className={inputClassName} placeholder="e.g. 50% Shareholder" />
                  </div>
                  <div className="md:col-span-1 pt-6 flex justify-end">
                    <button type="button" onClick={() => removeDirector(director.id)} className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors" title="Remove Director">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end pt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center bg-blue-600 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-500/20 disabled:opacity-70"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving Profile...
              </>
            ) : (
              "Save Profile"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
