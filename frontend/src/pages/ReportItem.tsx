import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Camera, 
  CheckCircle2, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Badge } from '../components/ui/Primitives';
import LiveCameraCapture from '../components/LiveCameraCapture';

export interface ReportItemProps {
  onReportSuccess?: () => void;
}

export default function ReportItem({ onReportSuccess }: ReportItemProps) {
  const [type, setType] = useState<'LOST' | 'FOUND'>('LOST');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Electronics',
    brand: '',
    model: '',
    color: 'Black',
    building: 'Library',
    floor: 2,
    location: '',
    event_time: new Date().toISOString().slice(0, 16),
    description: '',
    image: '',
    latitude: null as number | null,
    longitude: null as number | null,
    location_tag: '',
    // Private clues
    serial_number: '',
    unique_marks: '',
    damage_details: '',
    hidden_features: '',
    condition: 'Operational'
  });

  const [generatedCode, setGeneratedCode] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setGeneratedCode('');

    if (!formData.image) {
      setErrorMsg('Strict Live Verification: Please take a live photo using the camera before publishing your report.');
      setLoading(false);
      return;
    }

    try {
      if (type === 'LOST') {
        const res = await api.reportLost(formData);
        if (res.close_code) {
          setGeneratedCode(res.close_code);
        }
        setSuccessMsg(`Lost item reported successfully! ${res.matchesFound > 0 ? `AI discovered ${res.matchesFound} potential matches!` : 'Indexed in campus database.'}`);
      } else {
        const res = await api.reportFound(formData);
        if (res.close_code) {
          setGeneratedCode(res.close_code);
        }
        setSuccessMsg(`Found item securely registered! AI candidate matching initiated.`);
      }

      if (onReportSuccess && type === 'FOUND') {
        setTimeout(() => onReportSuccess(), 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-[#26262e] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="blue" className="font-mono">
              INTELLIGENT REGISTRATION
            </Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white mt-1">Report Campus Item</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Submit public metadata for retrieval while safeguarding sensitive identifying marks.
          </p>
        </div>

        {/* Type Toggle Tabs */}
        <div className="flex rounded-xl bg-zinc-100 dark:bg-[#141418] border border-zinc-200 dark:border-[#26262e] p-1">
          <button
            type="button"
            onClick={() => setType('LOST')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
              type === 'LOST' 
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            I Lost Something
          </button>
          <button
            type="button"
            onClick={() => setType('FOUND')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
              type === 'FOUND' 
                ? 'bg-blue-600 text-white dark:bg-sky-400 dark:text-zinc-900 shadow-xs' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            I Found Something
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-[#4ade80] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {generatedCode && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-900 dark:text-white space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-[#4ade80]" />
            <h4 className="text-sm font-bold uppercase tracking-wider font-mono">Your Secret 1-Time Handover Code</h4>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            Keep this code safe. When your lost item is located and you meet the <strong>Campus Verification Officer</strong> to collect it, recite this code to officially close the search:
          </p>
          <div className="p-3.5 bg-white dark:bg-[#141418] rounded-xl border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-between">
            <span className="text-2xl font-black font-mono tracking-widest text-emerald-600 dark:text-[#4ade80]">
              {generatedCode}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(generatedCode);
                alert(`Copied ${generatedCode} to clipboard!`);
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-mono transition-colors cursor-pointer shadow-xs"
            >
              Copy Code
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-500/20 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
            <span>Also sent to your email &amp; available in Telegram bot (@findoravsb_bot).</span>
            {onReportSuccess && (
              <button
                type="button"
                onClick={onReportSuccess}
                className="text-emerald-700 dark:text-[#4ade80] underline font-bold cursor-pointer"
              >
                Go to Items Registry →
              </button>
            )}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-[#fb7185] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Public Metadata */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#26262e] pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              Public Item Attributes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Title / Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Item Title / Name *</label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Dell XPS 15 Laptop or Hydro Flask"
                className="w-full text-xs bg-white dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#2e2e38] rounded-xl p-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full text-xs bg-white dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#2e2e38] rounded-xl p-3 text-zinc-900 dark:text-white focus:outline-none"
              >
                <option value="Electronics">Electronics</option>
                <option value="Bags">Bags &amp; Backpacks</option>
                <option value="Keys">Keys &amp; Fobs</option>
                <option value="Documents">IDs &amp; Student Cards</option>
                <option value="Clothing">Clothing &amp; Apparel</option>
                <option value="Accessories">Accessories &amp; Bottles</option>
              </select>
            </div>

            {/* Brand & Color Combined Row */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Brand / Make</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g. Apple, Dell, North Face"
                className="w-full text-xs bg-white dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#2e2e38] rounded-xl p-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Color / Edition</label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                placeholder="e.g. Matte Black, Space Gray, Navy Blue"
                className="w-full text-xs bg-white dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#2e2e38] rounded-xl p-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
              />
            </div>

            {/* Facility & Specific Location */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Campus Facility / Zone *</label>
              <select
                name="building"
                value={formData.building}
                onChange={handleChange}
                className="w-full text-xs bg-white dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#2e2e38] rounded-xl p-3 text-zinc-900 dark:text-white focus:outline-none"
              >
                <option value="Library">Central Library</option>
                <option value="Science Complex">Science Complex</option>
                <option value="Student Union">Student Union</option>
                <option value="Gymnasium">Gymnasium</option>
                <option value="Dining Hall">Dining Hall</option>
                <option value="Engineering Center">Engineering Center</option>
                <option value="Hostel Block A">Hostel Block A</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Specific Location / Landmark</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. 2nd Floor Quiet Study Area near desk 14"
                className="w-full text-xs bg-white dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#2e2e38] rounded-xl p-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
              />
            </div>

            {/* General Public Description */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">General Public Description *</label>
              <textarea
                name="description"
                rows={3}
                required
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe visible characteristics without disclosing your secret identifying clues..."
                className="w-full text-xs bg-white dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#2e2e38] rounded-xl p-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
              />
            </div>

            {/* Strictly Live Camera Evidence with Location Tag Watermark */}
            <div className="sm:col-span-2 pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyan-500" />
                  Live Physical Evidence &amp; GPS Telemetry *
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                  No Gallery Uploads Allowed
                </span>
              </div>

              <LiveCameraCapture 
                building={formData.building}
                location={formData.location}
                capturedImage={formData.image}
                onCaptureComplete={({ imageUrl, latitude, longitude, locationTag }) => {
                  setFormData(prev => ({
                    ...prev,
                    image: imageUrl,
                    latitude,
                    longitude,
                    location_tag: locationTag
                  }));
                }}
                onReset={() => {
                  setFormData(prev => ({
                    ...prev,
                    image: '',
                    latitude: null,
                    longitude: null,
                    location_tag: ''
                  }));
                }}
              />
            </div>

          </div>
        </div>

        {/* Section 2: Dedicated Private Ownership Clues (Streamlined Encrypted Vault) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#141418] border border-blue-200 dark:border-blue-900/30 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#26262e] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-sky-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-sky-300 font-mono">
                Private Ownership Clues (Blind Vault)
              </span>
            </div>
            <Badge variant="emerald" className="font-mono">
              NEVER PUBLICLY DISPLAYED
            </Badge>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs text-blue-800 dark:text-sky-300 leading-relaxed">
            These secret traits are stored in an encrypted vault. The Findora Blind Verification engine uses them to formulate challenge questions to test claimants without exposing your private answers.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Streamlined Unique Marks & Defects */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Distinctive Secret Marks, Scratches &amp; Identifiers
              </label>
              <textarea
                rows={2}
                name="unique_marks"
                value={formData.unique_marks}
                onChange={handleChange}
                placeholder="e.g. Small red sticker on the underside, minor dent on upper corner, custom wallpaper"
                className="w-full text-xs bg-white dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#2e2e38] rounded-xl p-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
              />
            </div>

            {/* Serial Number (Optional) */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Serial Number / Hardware ID (Optional)</label>
              <input
                type="text"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleChange}
                placeholder="e.g. CN-0G783K-72872-24E or Student ID No."
                className="w-full text-xs bg-white dark:bg-[#0b0b0e] border border-zinc-200 dark:border-[#2e2e38] rounded-xl p-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
              />
            </div>

          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Submitting to AI Pipeline...' : `Publish ${type === 'LOST' ? 'Lost' : 'Found'} Item Report`}
          </button>
        </div>

      </form>

    </div>
  );
}
