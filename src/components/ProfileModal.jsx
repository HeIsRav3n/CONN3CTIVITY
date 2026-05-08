import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

export function ProfileModal({ isOpen, onClose, user }) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    twitter: '',
    cmType: 'Inbound',
    services: '',
    experience: '',
    communities: ['', '', ''],
    role: 'Collab Manager'
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      // Fallback if Supabase is not configured yet
      if (!supabase) {
        const savedData = localStorage.getItem(`profile_${user.id}`);
        if (savedData) {
          setProfileData(JSON.parse(savedData));
          setIsEditing(false);
        } else {
          setIsEditing(true);
        }
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfileData({
            twitter: data.twitter || '',
            cmType: data.cm_type || 'Inbound',
            services: data.services || '',
            experience: data.experience || '',
            communities: data.communities || ['', '', ''],
            role: data.role || 'Collab Manager'
          });
          setIsEditing(false);
        } else {
          setIsEditing(true);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setIsEditing(true);
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user?.id) return;

    if (!supabase) {
      localStorage.setItem(`profile_${user.id}`, JSON.stringify(profileData));
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: user.username,
        avatar_url: user.avatar,
        twitter: profileData.twitter,
        cm_type: profileData.cmType,
        services: profileData.services,
        experience: profileData.experience,
        communities: profileData.communities,
        role: profileData.role,
        updated_at: new Date().toISOString(),
      });

    if (!error) {
      setIsEditing(false);
    } else {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Check console for details.');
    }
    setIsLoading(false);
  };

  const updateCommunity = (index, value) => {
    const newCommunities = [...profileData.communities];
    newCommunities[index] = value;
    setProfileData({ ...profileData, communities: newCommunities });
  };

  const glassStyle = {
    background: 'rgba(11,10,8,0.85)',
    backdropFilter: 'blur(24px) saturate(1.5)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
    border: '1px solid rgba(201,169,110,0.15)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
  };

  const inputStyle = "w-full bg-black/40 border border-[#C9A96E]/20 rounded-sm px-3 py-2 text-[#EDE8DC] text-xs font-['Josefin_Sans'] focus:outline-none focus:border-[#C9A96E]/60 transition-colors placeholder:text-white/20";
  const labelStyle = "block text-[0.65rem] uppercase tracking-[0.15em] text-[#C9A96E]/80 mb-1 font-['Josefin_Sans'] font-light";

  if (!isOpen || !user) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={glassStyle}
          className="relative w-full max-w-md rounded-lg overflow-hidden flex flex-col"
        >
          {/* Top Decorative Line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#C9A96E] to-transparent opacity-50" />

          <div className="p-6 md:p-8">
            {/* Header: Avatar and Name */}
            <div className="flex items-center gap-4 mb-8">
              <div className="relative">
                <img
                  src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                  alt={user.username}
                  className="w-16 h-16 rounded-full border border-[#C9A96E]/50 object-cover"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#0B0A08] rounded-full" />
              </div>
              <div>
                <h2 className="text-[#EDE8DC] font-['Josefin_Sans'] text-xl font-light tracking-wider">
                  {user.username}
                </h2>
                <p className="text-[#C9A96E]/70 text-xs font-['Josefin_Sans'] tracking-widest uppercase mt-1">
                  {profileData.role}
                </p>
              </div>
            </div>

            <div className="relative">
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
                  >
                    <div>
                      <label className={labelStyle}>Twitter / X Handle</label>
                      <input
                        type="text"
                        placeholder="@username"
                        value={profileData.twitter}
                        onChange={(e) => setProfileData({ ...profileData, twitter: e.target.value })}
                        className={inputStyle}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>CM Type</label>
                        <select
                          value={profileData.cmType}
                          onChange={(e) => setProfileData({ ...profileData, cmType: e.target.value })}
                          className={inputStyle}
                        >
                          <option value="Inbound">Inbound</option>
                          <option value="Outbound">Outbound</option>
                          <option value="Both">Both</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelStyle}>Role Held</label>
                        <select
                          value={profileData.role}
                          onChange={(e) => setProfileData({ ...profileData, role: e.target.value })}
                          className={inputStyle}
                        >
                          <option value="Founder">Founder</option>
                          <option value="Collab Manager">Collab Manager</option>
                          <option value="Advisor">Advisor</option>
                          <option value="Moderator">Moderator</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelStyle}>Experience Level</label>
                      <input
                        type="text"
                        placeholder="e.g. 3 Years, Managed 10+ projects"
                        value={profileData.experience}
                        onChange={(e) => setProfileData({ ...profileData, experience: e.target.value })}
                        className={inputStyle}
                      />
                    </div>

                    <div>
                      <label className={labelStyle}>Services</label>
                      <textarea
                        rows={3}
                        placeholder="What do you offer? (e.g. Community growth, partnerships, engagement)"
                        value={profileData.services}
                        onChange={(e) => setProfileData({ ...profileData, services: e.target.value })}
                        className={`${inputStyle} resize-none`}
                      />
                    </div>

                    <div>
                      <label className={labelStyle}>Communities Represented (Max 3)</label>
                      <div className="flex flex-col gap-2">
                        {[0, 1, 2].map((i) => (
                          <input
                            key={i}
                            type="text"
                            placeholder={`Community ${i + 1}`}
                            value={profileData.communities[i]}
                            onChange={(e) => updateCommunity(i, e.target.value)}
                            className={inputStyle}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="mt-4 w-full bg-[#C9A96E]/20 hover:bg-[#C9A96E]/30 text-[#C9A96E] border border-[#C9A96E]/40 py-2.5 rounded-sm font-['Josefin_Sans'] text-xs tracking-widest uppercase transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Saving...' : 'Save Profile'}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="view"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col gap-5"
                  >
                    {/* View Mode Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 border border-white/5 p-3 rounded-sm">
                        <p className={labelStyle}>CM Type</p>
                        <p className="text-[#EDE8DC] text-sm font-['Josefin_Sans']">{profileData.cmType || '—'}</p>
                      </div>
                      <div className="bg-white/5 border border-white/5 p-3 rounded-sm">
                        <p className={labelStyle}>Experience</p>
                        <p className="text-[#EDE8DC] text-sm font-['Josefin_Sans']">{profileData.experience || '—'}</p>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 p-4 rounded-sm">
                      <p className={labelStyle}>Services</p>
                      <p className="text-[#EDE8DC]/80 text-sm font-['Josefin_Sans'] whitespace-pre-wrap">
                        {profileData.services || 'No services listed.'}
                      </p>
                    </div>

                    <div>
                      <p className={labelStyle}>Communities Represented</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profileData.communities.filter(c => c.trim() !== '').length > 0 ? (
                          profileData.communities.filter(c => c.trim() !== '').map((community, idx) => (
                            <span key={idx} className="bg-[#C9A96E]/10 border border-[#C9A96E]/20 text-[#C9A96E] px-3 py-1 rounded-full text-xs font-['Josefin_Sans'] tracking-wider">
                              {community}
                            </span>
                          ))
                        ) : (
                          <span className="text-white/30 text-xs italic">None</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      {profileData.twitter && (
                        <a
                          href={profileData.twitter.startsWith('http') ? profileData.twitter : `https://x.com/${profileData.twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] border border-[#1DA1F2]/30 py-2.5 rounded-sm font-['Josefin_Sans'] text-xs tracking-widest uppercase transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                          Connect on X
                        </a>
                      )}
                      
                      <button
                        onClick={() => setIsEditing(true)}
                        className={`${profileData.twitter ? 'w-auto px-4' : 'w-full'} bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 py-2.5 rounded-sm font-['Josefin_Sans'] text-xs tracking-widest uppercase transition-colors`}
                      >
                        Edit Profile
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* Close button inside modal */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/30 hover:text-white/80 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
