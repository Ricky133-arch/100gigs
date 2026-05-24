'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, X, Plus, Loader2, Briefcase, MapPin, DollarSign, Calendar, Image, ArrowRight } from 'lucide-react';

const CATEGORIES = [
  'Plumbing', 'Electrical', 'Carpentry', 'Makeup & Hair',
  'Cleaning', 'Painting', 'Car Repair', 'Tailoring',
  'Graphic Design', 'Photography', 'Tutoring', 'Delivery',
  'Event Planning', 'AC Repair', 'Other'
];

const LOCATIONS = [
  'GRA Phase 1', 'GRA Phase 2', 'Trans Amadi', 'Woji',
  'Elelenwo', 'Rumuomasi', 'Rumuola', 'Diobu', 'Borokiri',
  'D-Line', 'Rumuigbo', 'Ozuoba', 'Choba', 'Ada George',
  'Rukpokwu', 'Eneka', 'Mgbuoba', 'Rumola',
  'Port Harcourt City', 'Asari-Toru', 'Other'
];

export default function PostJob() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '', description: '', category: '',
    budgetMin: '', budgetMax: '', location: '', deadline: '',
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080f0a]">
        <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  if (session.user.role !== 'client') {
    return (
      <div className="min-h-screen bg-[#080f0a] flex items-center justify-center px-4">
        <div className="text-center p-10 rounded-3xl max-w-md w-full"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Briefcase size={36} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
          <h2 className="text-xl font-bold text-white mb-2">Clients Only</h2>
          <p className="text-white/40 text-sm mb-6">Only clients can post jobs. You're logged in as a service provider.</p>
          <button onClick={() => router.push('/browse')}
            className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition"
            style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}>
            Browse Available Jobs
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) { toast.error('Maximum 5 images allowed'); return; }
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} is too large (max 10MB)`); return false; }
      return true;
    });
    setImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviews(prev => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (images.length === 0) return [];
    setUploadingImages(true);
    const uploadedUrls = [];
    try {
      for (const image of images) {
        const formDataImg = new FormData();
        formDataImg.append('file', image);
        const res = await fetch('/api/upload', { method: 'POST', body: formDataImg });
        if (!res.ok) throw new Error('Image upload failed');
        const data = await res.json();
        uploadedUrls.push(data.url);
      }
    } catch {
      toast.error('Failed to upload images');
      throw new Error('Upload failed');
    } finally {
      setUploadingImages(false);
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return toast.error('Job title is required');
    if (formData.title.trim().length < 10) return toast.error('Title must be at least 10 characters');
    if (!formData.description.trim()) return toast.error('Description is required');
    if (formData.description.trim().length < 30) return toast.error('Description must be at least 30 characters');
    if (!formData.category) return toast.error('Please select a category');
    if (!formData.location) return toast.error('Please select a location');
    if (!formData.budgetMin || !formData.budgetMax) return toast.error('Please enter budget range');
    if (Number(formData.budgetMin) <= 0) return toast.error('Minimum budget must be greater than 0');
    if (Number(formData.budgetMin) > Number(formData.budgetMax)) return toast.error('Minimum budget cannot exceed maximum');

    setLoading(true);
    try {
      let imageUrls = [];
      if (images.length > 0) { toast.loading('Uploading images...'); imageUrls = await uploadImages(); toast.dismiss(); }
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, budgetMin: Number(formData.budgetMin), budgetMax: Number(formData.budgetMax), images: imageUrls }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to post job'); return; }
      toast.success('Job posted successfully!');
      router.push(`/jobs/${data._id}`);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const glassCard = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
  };

  const inputClass = "w-full px-4 py-3.5 rounded-xl text-sm outline-none transition placeholder-white/20";
  const onFocus = e => e.target.style.borderColor = 'rgba(74,222,128,0.5)';
  const onBlur  = e => e.target.style.borderColor = 'rgba(255,255,255,0.1)';
  const labelClass = "block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2";

  const Section = ({ icon: Icon, title, children }) => (
    <div className="p-6 rounded-2xl" style={glassCard}>
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(74,222,128,0.12)' }}>
          <Icon size={14} className="text-green-400" />
        </div>
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080f0a] relative overflow-x-hidden">
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes drift {
          0%,100% { transform:translate(0,0) scale(1); }
          33% { transform:translate(30px,-20px) scale(1.05); }
          66% { transform:translate(-20px,15px) scale(0.97); }
        }
        .fade-up { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) forwards; }
        .drift { animation: drift 14s ease-in-out infinite; }
        .d1{animation-delay:.05s} .d2{animation-delay:.1s} .d3{animation-delay:.15s}
        .d4{animation-delay:.2s}  .d5{animation-delay:.25s} .d6{animation-delay:.3s}
        select option { background: #111; color: white; }
      `}</style>

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full drift"
          style={{ background: 'radial-gradient(circle, rgba(22,163,74,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full drift"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', animationDelay: '5s' }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-12">

        {/* Header */}
        <div className={`mb-8 opacity-0 ${visible ? 'fade-up' : ''}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-green-400/60 mb-2">New Listing</p>
          <h1 className="text-3xl font-bold text-white mb-1">Post a Job</h1>
          <p className="text-white/35 text-sm">Fill in the details and providers will apply.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Title */}
          <div className={`opacity-0 ${visible ? 'fade-up d1' : ''}`}>
            <Section icon={Briefcase} title="Job Title">
              <label className={labelClass}>Title <span className="text-red-400">*</span></label>
              <input type="text" name="title" value={formData.title} onChange={handleChange}
                className={inputClass} style={inputStyle}
                placeholder="e.g. Fix leaking ceiling in Woji"
                onFocus={onFocus} onBlur={onBlur} required />
              <p className="text-xs text-white/20 mt-2">{formData.title.length}/100 characters</p>
            </Section>
          </div>

          {/* Description */}
          <div className={`opacity-0 ${visible ? 'fade-up d2' : ''}`}>
            <Section icon={Briefcase} title="Description">
              <label className={labelClass}>Details <span className="text-red-400">*</span></label>
              <textarea name="description" value={formData.description} onChange={handleChange}
                rows={5} className={`${inputClass} resize-none`} style={inputStyle}
                placeholder="Describe what needs to be done, any special requirements, materials needed..."
                onFocus={onFocus} onBlur={onBlur} required />
              <p className="text-xs text-white/20 mt-2">{formData.description.length} characters — more detail attracts better applicants</p>
            </Section>
          </div>

          {/* Category + Location */}
          <div className={`opacity-0 ${visible ? 'fade-up d3' : ''}`}>
            <Section icon={MapPin} title="Category & Location">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Category <span className="text-red-400">*</span></label>
                  <select name="category" value={formData.category} onChange={handleChange}
                    className={inputClass} style={inputStyle}
                    onFocus={onFocus} onBlur={onBlur} required>
                    <option value="">Select category</option>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Location <span className="text-red-400">*</span></label>
                  <select name="location" value={formData.location} onChange={handleChange}
                    className={inputClass} style={inputStyle}
                    onFocus={onFocus} onBlur={onBlur} required>
                    <option value="">Select area in PH</option>
                    {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
              </div>
            </Section>
          </div>

          {/* Budget */}
          <div className={`opacity-0 ${visible ? 'fade-up d4' : ''}`}>
            <Section icon={DollarSign} title="Budget Range (₦)">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Minimum <span className="text-red-400">*</span></label>
                  <input type="number" name="budgetMin" value={formData.budgetMin} onChange={handleChange}
                    placeholder="5,000" min="0" className={inputClass} style={inputStyle}
                    onFocus={onFocus} onBlur={onBlur} required />
                </div>
                <div>
                  <label className={labelClass}>Maximum <span className="text-red-400">*</span></label>
                  <input type="number" name="budgetMax" value={formData.budgetMax} onChange={handleChange}
                    placeholder="20,000" min="0" className={inputClass} style={inputStyle}
                    onFocus={onFocus} onBlur={onBlur} required />
                </div>
              </div>
              {formData.budgetMin && formData.budgetMax && Number(formData.budgetMin) <= Number(formData.budgetMax) && (
                <p className="text-sm text-green-400 font-semibold mt-3">
                  ₦{Number(formData.budgetMin).toLocaleString()} — ₦{Number(formData.budgetMax).toLocaleString()}
                </p>
              )}
            </Section>
          </div>

          {/* Deadline */}
          <div className={`opacity-0 ${visible ? 'fade-up d5' : ''}`}>
            <Section icon={Calendar} title="Deadline">
              <label className={labelClass}>Date <span className="text-white/20 normal-case tracking-normal font-normal">(optional)</span></label>
              <input type="date" name="deadline" value={formData.deadline} onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className={inputClass} style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={onFocus} onBlur={onBlur} />
            </Section>
          </div>

          {/* Images */}
          <div className={`opacity-0 ${visible ? 'fade-up d6' : ''}`}>
            <Section icon={Image} title="Photos">
              <label className={labelClass}>Upload <span className="text-white/20 normal-case tracking-normal font-normal">(optional, max 5)</span></label>
              <p className="text-xs text-white/30 mb-4">Add photos to help providers understand the job better.</p>

              {imagePreviews.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img src={preview} alt={`Preview ${index + 1}`}
                        className="w-full h-28 object-cover rounded-xl"
                        style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
                      <button type="button" onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        style={{ background: 'rgba(239,68,68,0.9)' }}>
                        <X size={11} className="text-white" />
                      </button>
                    </div>
                  ))}
                  {imagePreviews.length < 5 && (
                    <label className="w-full h-28 rounded-xl flex flex-col items-center justify-center cursor-pointer transition"
                      style={{ border: '1px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(74,222,128,0.4)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}>
                      <Plus size={18} className="text-white/25 mb-1" />
                      <span className="text-xs text-white/25">Add more</span>
                      <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>
                  )}
                </div>
              ) : (
                <label className="w-full h-32 rounded-xl flex flex-col items-center justify-center cursor-pointer transition"
                  style={{ border: '1px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(74,222,128,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}>
                  <Upload size={24} className="text-white/20 mb-2" />
                  <span className="text-sm text-white/30">Click to upload photos</span>
                  <span className="text-xs text-white/20 mt-1">PNG, JPG up to 10MB each</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </Section>
          </div>

          {/* Submit */}
          <div className={`opacity-0 ${visible ? 'fade-up d6' : ''}`}>
            <button type="submit" disabled={loading || uploadingImages}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-white transition-all active:scale-[0.99] disabled:opacity-50 group"
              style={{
                background: (loading || uploadingImages) ? 'rgba(22,163,74,0.6)' : 'linear-gradient(135deg,#16a34a,#15803d)',
                boxShadow: (loading || uploadingImages) ? 'none' : '0 4px 24px rgba(22,163,74,0.35)',
              }}>
              {loading || uploadingImages ? (
                <><Loader2 size={18} className="animate-spin" />{uploadingImages ? 'Uploading images...' : 'Posting job...'}</>
              ) : (
                <>Post Job <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}