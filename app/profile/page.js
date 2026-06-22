'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, MapPin, Phone, Briefcase, Save, Loader2,
  CheckCircle, ArrowRight, Camera, Link2, Copy, Check,
  Instagram, Twitter, Youtube, Linkedin, Facebook,
} from 'lucide-react';
import { toast } from 'sonner';
import VerifiedBadge from '@/components/VerifiedBadge';

const SKILLS = [
  'Plumbing', 'Electrical', 'Carpentry', 'Makeup & Hair',
  'Cleaning', 'Painting', 'Car Repair', 'Tailoring',
  'Graphic Design', 'Photography', 'Tutoring', 'Delivery',
  'Event Planning', 'AC Repair', 'Other',
];

const LOCATIONS = [
  'GRA Phase 1', 'GRA Phase 2', 'Trans Amadi', 'Woji',
  'Elelenwo', 'Rumuomasi', 'Diobu', 'Borokiri',
  'D-Line', 'Choba', 'Ada George', 'Rukpokwu',
  'Port Harcourt City', 'Other',
];

// Social platform config
const SOCIAL_PLATFORMS = [
  
  {
    key:         'instagram',
    label:       'Instagram',
    placeholder: '@yourhandle',
    hint:        'Share your work portfolio on Instagram',
    icon:        '📸',
    buildUrl:    (v) => `https://instagram.com/${v.replace('@', '')}`,
  },
  {
    key:         'facebook',
    label:       'Facebook',
    placeholder: 'your.page or full URL',
    hint:        'Your Facebook profile or business page',
    icon:        '👥',
    buildUrl:    (v) => v.startsWith('http') ? v : `https://facebook.com/${v}`,
  },
  {
    key:         'twitter',
    label:       'X (Twitter)',
    placeholder: '@yourhandle',
    hint:        'Your X / Twitter handle',
    icon:        '𝕏',
    buildUrl:    (v) => `https://x.com/${v.replace('@', '')}`,
  },
  {
    key:         'tiktok',
    label:       'TikTok',
    placeholder: '@yourhandle',
    hint:        'Short videos of your work build serious trust',
    icon:        '🎵',
    buildUrl:    (v) => `https://tiktok.com/@${v.replace('@', '')}`,
  },
  {
    key:         'linkedin',
    label:       'LinkedIn',
    placeholder: 'your-name or full URL',
    hint:        'Professional profile for corporate clients',
    icon:        '💼',
    buildUrl:    (v) => v.startsWith('http') ? v : `https://linkedin.com/in/${v}`,
  },
  {
    key:         'youtube',
    label:       'YouTube',
    placeholder: '@yourchannel or full URL',
    hint:        'Video tutorials or completed project showcases',
    icon:        '▶️',
    buildUrl:    (v) => v.startsWith('http') ? v : `https://youtube.com/@${v.replace('@', '')}`,
  },
];

const glass = {
  background:          'rgba(255,255,255,0.04)',
  border:              '1px solid rgba(255,255,255,0.08)',
  backdropFilter:      'blur(12px)',
  WebkitBackdropFilter:'blur(12px)',
};

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border:     '1px solid rgba(255,255,255,0.1)',
  color:      'white',
};

const onFocus = e => e.target.style.borderColor = 'rgba(74,222,128,0.5)';
const onBlur  = e => e.target.style.borderColor = 'rgba(255,255,255,0.1)';

const Section = ({ icon: Icon, title, children }) => (
  <div className="p-6 rounded-2xl" style={glass}>
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

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState({
    name: '', email: '', phone: '', bio: '', location: '', skills: [],
    avatar: '', verificationStatus: 'unsubmitted', username: '',
    socialLinks: {
       instagram: '', facebook: '',
      twitter: '', tiktok: '', linkedin: '', youtube: '',
    },
  });

  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [visible,         setVisible]         = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [copied,          setCopied]          = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null); // null | true | false

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status]);

  useEffect(() => {
    if (session) {
      fetchProfile();
      setTimeout(() => setVisible(true), 100);
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const res  = await fetch('/api/users/profile');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setProfile({
        name:               data.name               || '',
        email:              data.email              || '',
        phone:              data.phone              || '',
        bio:                data.bio                || '',
        location:           data.location           || '',
        skills:             data.skills             || [],
        avatar:             data.avatar             || '',
        verificationStatus: data.verificationStatus || 'unsubmitted',
        username:           data.username           || '',
        socialLinks: {
          
          instagram: data.socialLinks?.instagram || '',
          facebook:  data.socialLinks?.facebook  || '',
          twitter:   data.socialLinks?.twitter   || '',
          tiktok:    data.socialLinks?.tiktok    || '',
          linkedin:  data.socialLinks?.linkedin  || '',
          youtube:   data.socialLinks?.youtube   || '',
        },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = e => setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleSocialChange = (key, value) => setProfile(prev => ({
    ...prev,
    socialLinks: { ...prev.socialLinks, [key]: value },
  }));

  const toggleSkill = skill => setProfile(prev => ({
    ...prev,
    skills: prev.skills.includes(skill)
      ? prev.skills.filter(s => s !== skill)
      : [...prev.skills, skill],
  }));

  // ── Username availability check (debounced) ──────────────────────────────
  useEffect(() => {
    if (!profile.username || profile.username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const res = await fetch(`/api/users/check-username?username=${profile.username}`);
        const data = await res.json();
        setUsernameAvailable(data.available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [profile.username]);

  // ── Copy shareable link ──────────────────────────────────────────────────
  const shareableLink = profile.username
    ? `${window?.location?.origin}/u/${profile.username}`
    : `${window?.location?.origin}/profile/${session?.user?.id}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    toast.success('Profile link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Avatar upload ────────────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image too large (max 10MB)'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res  = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      await fetch('/api/users/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...profile, avatar: data.url }),
      });

      setProfile(prev => ({ ...prev, avatar: data.url }));
      toast.success('Profile photo updated!');
    } catch {
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(profile),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Profile updated!');
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080f0a]">
        <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3.5 rounded-xl text-sm outline-none transition placeholder-white/20";
  const labelClass = "block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2";

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
        .d7{animation-delay:.35s} .d8{animation-delay:.4s}
        select option { background: #111; color: white; }
      `}</style>

      {/* Orbs */}
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
          <p className="text-xs font-semibold uppercase tracking-widest text-green-400/60 mb-2">Account</p>
          <h1 className="text-3xl font-bold text-white mb-1">My Profile</h1>
          <p className="text-white/35 text-sm">
            Keep your profile updated to attract more {session?.user?.role === 'client' ? 'quality providers' : 'clients and jobs'}.
          </p>
        </div>

        {/* Avatar card */}
        <div className={`flex items-center gap-5 p-5 rounded-2xl mb-6 opacity-0 ${visible ? 'fade-up d1' : ''}`}
          style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.15) 0%, rgba(5,150,105,0.1) 100%)', border: '1px solid rgba(74,222,128,0.2)' }}>
          <label className="relative shrink-0 cursor-pointer group">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 20px rgba(22,163,74,0.3)' }}>
              {profile.avatar
                ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                : session?.user?.name?.charAt(0).toUpperCase()
              }
            </div>
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              style={{ background: 'rgba(0,0,0,0.5)' }}>
              {uploadingAvatar ? <Loader2 size={18} className="text-white animate-spin" /> : <Camera size={18} className="text-white" />}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full" style={{ border: '2px solid #080f0a' }} />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar} />
          </label>

          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-white truncate inline-flex items-center gap-1.5">
              {session?.user?.name}
              {profile.verificationStatus === 'verified' && <VerifiedBadge size={16} />}
            </p>
            <p className="text-white/40 text-sm truncate">{session?.user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize"
                style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                {session?.user?.role}
              </span>
              {session?.user?.role === 'provider' && profile.verificationStatus !== 'verified' && (
                <a href="/verification" className="text-xs font-semibold px-2.5 py-0.5 rounded-full transition hover:brightness-110"
                  style={{ background: 'rgba(250,204,21,0.12)', color: '#facc15', border: '1px solid rgba(250,204,21,0.25)' }}>
                  {profile.verificationStatus === 'pending' ? 'Verification pending' : 'Get verified →'}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Shareable profile link ──────────────────────────────────────── */}
        <div className={`p-5 rounded-2xl mb-4 opacity-0 ${visible ? 'fade-up d1' : ''}`}
          style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={14} className="text-green-400" />
            <p className="text-sm font-semibold text-white">Your Shareable Profile Link</p>
          </div>
          <p className="text-xs text-white/40 mb-3">
            Share this link on WhatsApp, Instagram bio, or anywhere — clients can see your full profile, skills, and reviews.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2.5 rounded-xl text-xs font-mono truncate"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#4ade80' }}>
              {shareableLink}
            </div>
            <button onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition shrink-0"
              style={{ background: copied ? 'rgba(74,222,128,0.2)' : 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
              {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">

          {/* Basic Info */}
          <div className={`opacity-0 ${visible ? 'fade-up d2' : ''}`}>
            <Section icon={User} title="Basic Information">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input type="text" name="name" value={profile.name} onChange={handleChange}
                    className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" value={profile.email} disabled
                    className={`${inputClass} opacity-40 cursor-not-allowed`} style={inputStyle} />
                  <p className="text-xs text-white/20 mt-1.5">Email cannot be changed</p>
                </div>

                {/* Username */}
                <div>
                  <label className={labelClass}>Custom Username</label>
                  <div className="flex items-center gap-0 rounded-xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span className="px-3 py-3.5 text-sm text-white/30 shrink-0 border-r" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                      100gigs.com/u/
                    </span>
                    <input
                      type="text"
                      name="username"
                      value={profile.username}
                      onChange={e => {
                        // Only allow valid chars as they type
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                        setProfile(prev => ({ ...prev, username: val }));
                        setUsernameAvailable(null);
                      }}
                      placeholder="your-name"
                      maxLength={30}
                      className="flex-1 px-3 py-3.5 text-sm bg-transparent outline-none text-white placeholder-white/20"
                    />
                    <div className="px-3">
                      {usernameChecking && <Loader2 size={14} className="animate-spin text-white/30" />}
                      {!usernameChecking && usernameAvailable === true && <Check size={14} className="text-green-400" />}
                      {!usernameChecking && usernameAvailable === false && <span className="text-red-400 text-xs">Taken</span>}
                    </div>
                  </div>
                  <p className="text-xs text-white/20 mt-1.5">
                    Letters, numbers, hyphens and underscores only · 3–30 characters
                  </p>
                  {usernameAvailable === false && (
                    <p className="text-xs text-red-400 mt-1">This username is taken. Try another.</p>
                  )}
                  {usernameAvailable === true && (
                    <p className="text-xs text-green-400 mt-1">✓ Username is available!</p>
                  )}
                </div>
              </div>
            </Section>
          </div>

          {/* Contact */}
          <div className={`opacity-0 ${visible ? 'fade-up d3' : ''}`}>
            <Section icon={Phone} title="Contact & Location">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input type="tel" name="phone" value={profile.phone} onChange={handleChange}
                    placeholder="08012345678" className={inputClass} style={inputStyle}
                    onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label className={labelClass}>Location in PH</label>
                  <select name="location" value={profile.location} onChange={handleChange}
                    className={`${inputClass} cursor-pointer`} style={inputStyle}
                    onFocus={onFocus} onBlur={onBlur}>
                    <option value="">Select your area</option>
                    {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
              </div>
            </Section>
          </div>

          {/* Bio */}
          <div className={`opacity-0 ${visible ? 'fade-up d4' : ''}`}>
            <Section icon={Briefcase} title="About You">
              <label className={labelClass}>Bio</label>
              <textarea name="bio" value={profile.bio} onChange={handleChange} rows={4}
                placeholder="Tell clients about your experience, what makes you the best choice..."
                className={`${inputClass} resize-none`} style={inputStyle}
                onFocus={onFocus} onBlur={onBlur} />
              <div className="flex justify-between mt-2">
                <p className="text-xs text-white/20">{profile.bio.length} characters</p>
                {profile.bio.length > 50 && <p className="text-xs text-green-400">Good profile bio!</p>}
              </div>
            </Section>
          </div>

          {/* Skills (providers only) */}
          {session?.user?.role === 'provider' && (
            <div className={`opacity-0 ${visible ? 'fade-up d5' : ''}`}>
              <Section icon={Briefcase} title="Your Skills">
                <p className="text-xs text-white/30 mb-4">Select all services you can provide</p>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map(skill => {
                    const active = profile.skills.includes(skill);
                    return (
                      <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                        className="px-3.5 py-2 rounded-xl text-xs font-medium transition-all"
                        style={{
                          background:  active ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
                          border:      active ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(255,255,255,0.08)',
                          color:       active ? '#4ade80' : 'rgba(255,255,255,0.45)',
                          transform:   active ? 'scale(1.03)' : 'scale(1)',
                        }}>
                        {skill}
                      </button>
                    );
                  })}
                </div>
                {profile.skills.length > 0 && (
                  <p className="text-xs text-green-400 mt-4 font-medium">
                    {profile.skills.length} skill{profile.skills.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </Section>
            </div>
          )}

          {/* ── Social Links ─────────────────────────────────────────────── */}
          <div className={`opacity-0 ${visible ? 'fade-up d6' : ''}`}>
            <div className="p-6 rounded-2xl" style={glass}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(74,222,128,0.12)' }}>
                  <Link2 size={14} className="text-green-400" />
                </div>
                <p className="text-sm font-semibold text-white">Social & Contact Links</p>
              </div>
              <p className="text-xs text-white/30 mb-5 ml-9">
                Add your socials so clients can verify your work and reach you on their preferred platform. These show on your public profile.
              </p>

              <div className="space-y-3">
                {SOCIAL_PLATFORMS.map(platform => {
                  const value = profile.socialLinks[platform.key] || '';
                  const hasValue = value.trim() !== '';
                  return (
                    <div key={platform.key}>
                      <label className="block text-xs font-medium text-white/40 mb-1.5">
                        <span className="mr-1.5">{platform.icon}</span>
                        {platform.label}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={value}
                          onChange={e => handleSocialChange(platform.key, e.target.value)}
                          placeholder={platform.placeholder}
                          className={`${inputClass} flex-1`}
                          style={inputStyle}
                          onFocus={onFocus}
                          onBlur={onBlur}
                        />
                        {hasValue && (
                          <a
                            href={platform.buildUrl(value)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-3.5 rounded-xl text-xs font-medium transition shrink-0"
                            style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
                            title={`Open ${platform.label}`}
                          >
                            ↗
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-white/20 mt-1 ml-1">{platform.hint}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Save */}
          <div className={`opacity-0 ${visible ? 'fade-up d8' : ''}`}>
            <button type="submit" disabled={saving || usernameAvailable === false}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-white transition-all active:scale-[0.99] disabled:opacity-50 group"
              style={{
                background:  saved ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#16a34a,#15803d)',
                boxShadow:   saved ? '0 4px 24px rgba(5,150,105,0.35)' : '0 4px 24px rgba(22,163,74,0.35)',
              }}>
              {saving  ? <><Loader2 size={18} className="animate-spin" /> Saving...</>
              : saved  ? <><CheckCircle size={18} /> Saved!</>
              : <><Save size={18} /> Save Profile <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}