'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Phone, Briefcase, Star, ArrowLeft } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

function StarDisplay({ rating, size = 16 }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(star => (
        <Star key={star} size={size}
          style={{ color: star <= Math.round(rating) ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                   fill: star <= Math.round(rating) ? '#fbbf24' : 'transparent' }} />
      ))}
    </div>
  );
}

export default function PublicProfile() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ratingsData, setRatingsData] = useState({ ratings: [], average: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProfile(); fetchRatings(); }, [id]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) throw new Error('Not found');
      setUser(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchRatings = async () => {
    try {
      const res = await fetch(`/api/ratings/${id}`);
      if (res.ok) setRatingsData(await res.json());
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#080f0a] flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-[#080f0a] flex flex-col items-center justify-center gap-4">
      <p className="text-white/40 text-sm">Profile not found.</p>
      <button onClick={() => router.back()}
        className="text-green-400 text-sm hover:text-green-300 transition flex items-center gap-1.5">
        <ArrowLeft size={14} /> Go back
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080f0a] relative overflow-x-hidden">
      <style>{`
        @keyframes drift {
          0%,100% { transform:translate(0,0) scale(1); }
          33% { transform:translate(30px,-20px) scale(1.05); }
          66% { transform:translate(-20px,15px) scale(0.97); }
        }
        .drift { animation: drift 14s ease-in-out infinite; }
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

      <div className="relative max-w-2xl mx-auto px-4 py-10 space-y-4">

        {/* Back */}
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-medium text-white/35 hover:text-green-400 transition mb-2">
          <ArrowLeft size={14} /> Back
        </button>

        {/* Profile header */}
        <div className="p-6 rounded-3xl" style={glass}>
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-18 h-18 w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
                style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 20px rgba(22,163,74,0.3)' }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full"
                style={{ border: '2px solid #080f0a' }} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white truncate inline-flex items-center gap-2">
                {user.name}
                {user.verificationStatus === 'verified' && <VerifiedBadge size={18} />}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize inline-block mt-1"
                style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                {user.role}
              </span>

              {/* Rating summary */}
              {ratingsData.total > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <StarDisplay rating={ratingsData.average} size={14} />
                  <span className="text-sm font-semibold text-white">{ratingsData.average}</span>
                  <span className="text-xs text-white/30">({ratingsData.total} review{ratingsData.total !== 1 ? 's' : ''})</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-3">
                {user.location && (
                  <span className="flex items-center gap-1.5 text-xs text-white/35">
                    <MapPin size={12} />{user.location}
                  </span>
                )}
                {user.phone && (
                  <span className="flex items-center gap-1.5 text-xs text-white/35">
                    <Phone size={12} />{user.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2">About</p>
              <p className="text-white/60 text-sm leading-relaxed">{user.bio}</p>
            </div>
          )}
        </div>

        {/* Skills */}
        {user.skills?.length > 0 && (
          <div className="p-6 rounded-2xl" style={glass}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(74,222,128,0.12)' }}>
                <Briefcase size={14} className="text-green-400" />
              </div>
              <p className="text-sm font-semibold text-white">Skills & Services</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.skills.map(skill => (
                <span key={skill} className="px-3.5 py-2 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="p-6 rounded-2xl" style={glass}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(251,191,36,0.12)' }}>
              <Star size={14} style={{ color: '#fbbf24' }} />
            </div>
            <p className="text-sm font-semibold text-white">
              Reviews {ratingsData.total > 0 && <span className="text-white/30 font-normal">({ratingsData.total})</span>}
            </p>
          </div>

          {ratingsData.total === 0 ? (
            <div className="text-center py-10">
              <Star size={28} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.08)' }} />
              <p className="text-white/25 text-sm">No reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Average score */}
              <div className="flex items-center gap-5 p-5 rounded-2xl"
                style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
                <div className="text-center shrink-0">
                  <p className="text-4xl font-bold" style={{ color: '#fbbf24' }}>{ratingsData.average}</p>
                  <p className="text-xs text-white/25 mt-1">out of 5</p>
                </div>
                <div>
                  <StarDisplay rating={ratingsData.average} size={20} />
                  <p className="text-xs text-white/35 mt-1.5">
                    Based on {ratingsData.total} review{ratingsData.total !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Individual reviews */}
              <div className="space-y-4">
                {ratingsData.ratings.map(r => (
                  <div key={r._id} className="p-4 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{r.client?.name}</p>
                        {r.job?.title && (
                          <p className="text-xs text-white/25 mt-0.5 truncate">for: {r.job.title}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <StarDisplay rating={r.rating} size={12} />
                        <p className="text-[11px] text-white/25 mt-1">
                          {new Date(r.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    {r.review && (
                      <p className="text-white/45 text-xs leading-relaxed mt-2 pt-2"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        "{r.review}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}