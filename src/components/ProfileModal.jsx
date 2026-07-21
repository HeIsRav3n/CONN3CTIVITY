import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

function normalizeCommunities(value) {
  let list = [];
  if (Array.isArray(value)) list = value;
  else if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      list = [];
    }
  }
  return [list[0] || '', list[1] || '', list[2] || ''];
}

export function ProfileModal({ isOpen, onClose, user }) {
  const [isEditing, setIsEditing] = useState(true);
  const [profileData, setProfileData] = useState({
    twitter: '',
    telegram: '',
    cmType: 'Inbound',
    services: '',
    experience: '1 Year',
    communities: ['', '', ''],
    role: 'Collab Manager'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const saveTimer = useRef(null);
  const skipAutosave = useRef(true);
  const profileDataRef = useRef(profileData);

  useEffect(() => {
    profileDataRef.current = profileData;
  }, [profileData]);

  const persistProfile = useCallback(async (data, { quiet = false } = {}) => {
    if (!user?.id) return false;

    if (!quiet) setIsLoading(true);
    setSaveState('saving');

    if (!supabase) {
      localStorage.setItem(`profile_${user.id}`, JSON.stringify(data));
      localStorage.setItem(`profile_${user.discord_id || user.id}`, JSON.stringify(data));
      setSaveState('saved');
      if (!quiet) setIsLoading(false);
      return true;
    }

    const payload = {
      id: user.id,
      username: user.username,
      discord_id: user.discord_id || user.id,
      avatar_url: user.avatar_url || (user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null),
      twitter: data.twitter,
      telegram: data.telegram,
      cm_type: data.cmType,
      services: data.services,
      experience: data.experience,
      communities: data.communities,
      role: data.role,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(payload);

    // Also mirror under discord snowflake key in localStorage for map fallback
    try {
      localStorage.setItem(`profile_${user.discord_id || user.id}`, JSON.stringify(data));
      localStorage.setItem(`profile_${user.id}`, JSON.stringify(data));
    } catch {
      // ignore
    }

    if (error) {
      console.error('Error saving profile:', error);
      setSaveState('error');
      if (!quiet) {
        setIsLoading(false);
        alert('Failed to save profile. Check console for details.');
      }
      return false;
    }

    setSaveState('saved');
    if (!quiet) setIsLoading(false);
    return true;
  }, [user]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id || !isOpen) return;
      skipAutosave.current = true;

      if (!supabase) {
        const savedData = localStorage.getItem(`profile_${user.id}`)
          || localStorage.getItem(`profile_${user.discord_id}`);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setProfileData({
            twitter: parsed.twitter || '',
            telegram: parsed.telegram || '',
            cmType: parsed.cmType || parsed.cm_type || 'Inbound',
            services: parsed.services || '',
            experience: parsed.experience || '1 Year',
            communities: normalizeCommunities(parsed.communities),
            role: parsed.role || 'Collab Manager',
          });
        }
        setIsEditing(true);
        setTimeout(() => { skipAutosave.current = false }, 400);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) console.warn('Profile load:', error.message);

        if (data) {
          setProfileData({
            twitter: data.twitter || '',
            telegram: data.telegram || '',
            cmType: data.cm_type || 'Inbound',
            services: data.services || '',
            experience: data.experience || '1 Year',
            communities: normalizeCommunities(data.communities),
            role: data.role || 'Collab Manager',
          });
        }
        setIsEditing(true);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setIsEditing(true);
      }
      setIsLoading(false);
      setTimeout(() => { skipAutosave.current = false }, 400);
    };

    fetchProfile();
  }, [user, isOpen]);

  // Autosave while editing — reflects live on map via Supabase Realtime
  useEffect(() => {
    if (!isOpen || !user?.id || !isEditing || skipAutosave.current) return undefined;

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistProfile(profileDataRef.current, { quiet: true });
    }, 700);

    return () => clearTimeout(saveTimer.current);
  }, [profileData, isOpen, isEditing, user, persistProfile]);

  // Flush save on close
  useEffect(() => {
    if (isOpen) return undefined;
    clearTimeout(saveTimer.current);
    if (user?.id && !skipAutosave.current) {
      persistProfile(profileDataRef.current, { quiet: true });
    }
    return undefined;
  }, [isOpen, user, persistProfile]);

  const handleSave = async () => {
    const ok = await persistProfile(profileData, { quiet: false });
    if (ok) setIsEditing(false);
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

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen || !user) return null;

  const saveLabel =
    saveState === 'saving' ? 'Saving…'
    : saveState === 'saved' ? 'Saved'
    : saveState === 'error' ? 'Save failed'
    : 'Autosave on';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Your profile"
      >
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
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#C9A96E] to-transparent opacity-50" />

          <div className="p-6 md:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <img
                  src={user.avatar_url || (user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`)}
                  alt={user.username}
                  className="w-16 h-16 rounded-full border border-[#C9A96E]/50 object-cover"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#0B0A08] rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[#EDE8DC] font-['Josefin_Sans'] text-xl font-light tracking-wider">
                  {user.username}
                </h2>
                <p className="text-[#C9A96E]/70 text-xs font-['Josefin_Sans'] tracking-widest uppercase mt-1">
                  {profileData.role}
                </p>
              </div>
              <span
                className="font-['Josefin_Sans'] text-[0.5rem] tracking-[0.2em] uppercase"
                style={{
                  color: saveState === 'error' ? '#ef4444'
                    : saveState === 'saved' ? '#22c55e'
                    : saveState === 'saving' ? '#C9A96E'
                    : 'rgba(237,232,220,0.35)',
                }}
              >
                {saveLabel}
              </span>
            </div>

            <div className="relative">
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar pb-20">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelStyle}>Twitter / X</label>
                          <input
                            type="text"
                            placeholder="@handle"
                            value={profileData.twitter}
                            onChange={(e) => setProfileData({ ...profileData, twitter: e.target.value })}
                            className={inputStyle}
                          />
                        </div>
                        <div>
                          <label className={labelStyle}>Telegram</label>
                          <input
                            type="text"
                            placeholder="@handle"
                            value={profileData.telegram}
                            onChange={(e) => setProfileData({ ...profileData, telegram: e.target.value })}
                            className={inputStyle}
                          />
                        </div>
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
                        <select
                          value={profileData.experience}
                          onChange={(e) => setProfileData({ ...profileData, experience: e.target.value })}
                          className={inputStyle}
                        >
                          <option value="Less Than A Year">Less Than A Year</option>
                          <option value="1 Year">1 Year</option>
                          <option value="2 Years">2 Years</option>
                          <option value="3 Years">3 Years</option>
                          <option value="4 Years">4 Years</option>
                          <option value="5 Years+">5 Years+</option>
                        </select>
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
                        <label className={labelStyle}>Communities Represented (Top 3)</label>
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
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0B0A08] via-[#0B0A08] to-transparent pt-10">
                      <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="w-full bg-[#C9A96E] hover:bg-[#D4B882] text-[#0B0A08] py-3 rounded-sm font-['Josefin_Sans'] text-xs tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(201,169,110,0.3)] font-bold disabled:opacity-50"
                      >
                        {isLoading ? 'Saving...' : 'Done'}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="view"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col gap-5"
                  >
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

                    {(profileData.twitter || profileData.telegram) && (
                      <div className="flex flex-wrap gap-2">
                        {profileData.twitter && (
                          <a
                            href={`https://x.com/${profileData.twitter.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-sm text-[#EDE8DC]/70 text-xs font-['Josefin_Sans'] hover:border-[#C9A96E]/40 transition-colors"
                          >
                            @{profileData.twitter.replace('@', '')}
                          </a>
                        )}
                        {profileData.telegram && (
                          <a
                            href={`https://t.me/${profileData.telegram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-sm text-[#EDE8DC]/70 text-xs font-['Josefin_Sans'] hover:border-[#C9A96E]/40 transition-colors"
                          >
                            TG {profileData.telegram}
                          </a>
                        )}
                      </div>
                    )}

                    {profileData.communities.filter(c => c.trim() !== '').length > 0 && (
                      <div>
                        <p className={labelStyle}>Communities</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {profileData.communities.filter(c => c.trim() !== '').map((community, idx) => (
                            <span key={idx} className="px-2 py-1 bg-[#C9A96E]/10 border border-[#C9A96E]/20 text-[#C9A96E] text-[0.65rem] font-['Josefin_Sans'] tracking-wide rounded-sm">
                              {community}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full mt-2 border border-[#C9A96E]/30 hover:bg-[#C9A96E]/10 text-[#C9A96E] py-3 rounded-sm font-['Josefin_Sans'] text-xs tracking-widest uppercase transition-all"
                    >
                      Edit Profile
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
