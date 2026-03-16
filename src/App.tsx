/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, RefreshCw, Settings, X, Maximize2, ExternalLink, Download, Info, Moon, Sun, Shield, Mail, Lock, FileOutput, FileInput, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Zone, SortOption, PopularityMap } from './types';

const COVER_URL = "https://cdn.jsdelivr.net/gh/gn-math/covers@main";
const HTML_URL = "https://cdn.jsdelivr.net/gh/gn-math/html@main";

export default function App() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterTag, setFilterTag] = useState<string>('none');
  const [popularityData, setPopularityData] = useState<PopularityMap>({
    year: {},
    month: {},
    week: {},
    day: {}
  });
  const [activeZone, setActiveZone] = useState<Zone | null>(null);
  const [activeZoneHtml, setActiveZoneHtml] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activePopup, setActivePopup] = useState<'settings' | 'dmca' | 'contact' | 'privacy' | 'cloak' | 'info' | null>(null);
  const [tabTitle, setTabTitle] = useState('gn-math');
  const [tabIcon, setTabIcon] = useState('favicon.png');
  const [isFeaturedExpanded, setIsFeaturedExpanded] = useState(true);
  const [isAllExpanded, setIsAllExpanded] = useState(true);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch zones and popularity data
  useEffect(() => {
    async function fetchData() {
      try {
        let zonesURL = "https://cdn.jsdelivr.net/gh/gn-math/assets@main/zones.json";
        try {
          const shaResponse = await fetch("https://api.github.com/repos/gn-math/assets/commits?t=" + Date.now());
          if (shaResponse.ok) {
            const shaJson = await shaResponse.json();
            const sha = shaJson[0]?.sha;
            if (sha) {
              zonesURL = `https://cdn.jsdelivr.net/gh/gn-math/assets@${sha}/zones.json`;
            }
          }
        } catch (e) {
          console.warn("Failed to fetch GitHub SHA, falling back to main", e);
        }

        const response = await fetch(zonesURL + "?t=" + Date.now());
        const json = await response.json();
        const zonesData = json.map((z: any) => ({ ...z, featured: z.id === -1 || z.featured }));
        setZones(zonesData);

        // Check for initial ID in URL
        const params = new URLSearchParams(window.location.search);
        const initialId = params.get('id');
        if (initialId) {
          const zone = zonesData.find((z: any) => z.id.toString() === initialId);
          if (zone) {
            handleOpenZone(zone);
          }
        }

        // Fetch popularity data
        const periods: (keyof PopularityMap)[] = ['year', 'month', 'week', 'day'];
        const popData: PopularityMap = { year: {}, month: {}, week: {}, day: {} };

        await Promise.all(periods.map(async (period) => {
          try {
            const res = await fetch(`https://data.jsdelivr.net/v1/stats/packages/gh/gn-math/html@main/files?period=${period}`);
            const data = await res.json();
            data.forEach((file: any) => {
              const idMatch = file.name.match(/\/(\d+)\.html$/);
              if (idMatch) {
                const id = parseInt(idMatch[1]);
                popData[period][id] = file.hits?.total ?? 0;
              }
            });
          } catch (e) {
            console.error(`Failed to fetch popularity for ${period}`, e);
          }
        }));
        setPopularityData(popData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Tab cloak effect
  useEffect(() => {
    document.title = tabTitle;
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = tabIcon;
    }
  }, [tabTitle, tabIcon]);

  // Filter and sort zones
  const processedZones = useMemo(() => {
    let filtered = zones.filter(zone => 
      zone.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (filterTag === 'none' || zone.special?.includes(filterTag))
    );

    filtered.sort((a, b) => {
      if (a.id === -1) return -1;
      if (b.id === -1) return 1;

      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'id': return a.id - b.id;
        case 'popular': return (popularityData.year[b.id] || 0) - (popularityData.year[a.id] || 0);
        case 'trendingMonth': return (popularityData.month[b.id] || 0) - (popularityData.month[a.id] || 0);
        case 'trendingWeek': return (popularityData.week[b.id] || 0) - (popularityData.week[a.id] || 0);
        case 'trendingDay': return (popularityData.day[b.id] || 0) - (popularityData.day[a.id] || 0);
        default: return 0;
      }
    });

    return filtered;
  }, [zones, searchQuery, sortBy, filterTag, popularityData]);

  const featuredZones = useMemo(() => processedZones.filter(z => z.featured), [processedZones]);
  const allZones = processedZones;

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    zones.forEach(z => z.special?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [zones]);

  const handleOpenZone = async (zone: Zone) => {
    if (zone.url.startsWith("http")) {
      window.open(zone.url, "_blank");
      return;
    }

    const url = zone.url.replace("{COVER_URL}", COVER_URL).replace("{HTML_URL}", HTML_URL);
    try {
      const response = await fetch(url + "?t=" + Date.now());
      const html = await response.text();
      setActiveZone(zone);
      setActiveZoneHtml(html);
      
      // Update URL params
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('id', zone.id.toString());
      window.history.pushState(null, '', newUrl.toString());
    } catch (e) {
      alert("Failed to load zone: " + e);
    }
  };

  const handleCloseZone = () => {
    setActiveZone(null);
    setActiveZoneHtml(null);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('id');
    window.history.pushState(null, '', newUrl.toString());
  };

  useEffect(() => {
    if (activeZoneHtml && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(activeZoneHtml);
        doc.close();
      }
    }
  }, [activeZoneHtml]);

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) iframeRef.current.requestFullscreen();
    }
  };

  const handleNewTab = () => {
    if (!activeZoneHtml) return;
    const newWindow = window.open("about:blank", "_blank");
    if (newWindow) {
      newWindow.document.open();
      newWindow.document.write(activeZoneHtml);
      newWindow.document.close();
    }
  };

  const handleDownload = () => {
    if (!activeZone || !activeZoneHtml) return;
    const blob = new Blob([activeZoneHtml], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeZone.name}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportData = async () => {
    alert("Exporting data... please wait.");
    const result: any = {
      localStorage: { ...localStorage },
      sessionStorage: { ...sessionStorage },
    };
    
    const blob = new Blob([JSON.stringify(result)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gn-math-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.localStorage) {
          Object.entries(data.localStorage).forEach(([key, value]) => localStorage.setItem(key, value as string));
        }
        alert("Data imported successfully! Refreshing...");
        window.location.reload();
      } catch (err) {
        alert("Failed to import data: " + err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--gradient-primary)] text-white shadow-lg backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent cursor-pointer" onClick={() => window.location.reload()}>
            gn-math
          </div>
          
          <div className="flex-1 max-w-2xl w-full flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search zones..." 
                className="w-full pl-10 pr-4 py-3 bg-[var(--glass)] text-[var(--text)] rounded-[var(--radius)] outline-none focus:bg-white dark:focus:bg-[var(--bg)] transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className="px-4 py-3 bg-[var(--glass)] text-[var(--text-muted)] rounded-[var(--radius)] outline-none cursor-pointer hover:bg-white dark:hover:bg-[var(--bg)] transition-all shadow-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="name">Name</option>
              <option value="id">ID (Date)</option>
              <option value="popular">Popular</option>
              <option value="trendingDay">Trending (Day)</option>
              <option value="trendingWeek">Trending (Week)</option>
              <option value="trendingMonth">Trending (Month)</option>
            </select>
            <select 
              className="px-4 py-3 bg-[var(--glass)] text-[var(--text-muted)] rounded-[var(--radius)] outline-none cursor-pointer hover:bg-white dark:hover:bg-[var(--bg)] transition-all shadow-sm hidden sm:block"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
            >
              <option value="none">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag.charAt(0).toUpperCase() + tag.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button 
              className="p-3 bg-white/10 hover:bg-white/20 rounded-[var(--radius)] transition-all"
              onClick={() => window.location.reload()}
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button 
              className="p-3 bg-white/10 hover:bg-white/20 rounded-[var(--radius)] transition-all"
              onClick={() => setActivePopup('settings')}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Featured Zones */}
            {featuredZones.length > 0 && (
              <section>
                <button 
                  onClick={() => setIsFeaturedExpanded(!isFeaturedExpanded)}
                  className="w-full flex items-center gap-3 text-xl font-bold mb-6 group"
                >
                  <motion.div
                    animate={{ rotate: isFeaturedExpanded ? 0 : -90 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <ChevronDown className="w-6 h-6 text-[var(--primary)]" />
                  </motion.div>
                  Featured Zones ({featuredZones.length})
                </button>
                <AnimatePresence initial={false}>
                  {isFeaturedExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-2">
                        {featuredZones.map(zone => (
                          <ZoneCard key={zone.id} zone={zone} onClick={() => handleOpenZone(zone)} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )}

            {/* All Zones */}
            <section>
              <button 
                onClick={() => setIsAllExpanded(!isAllExpanded)}
                className="w-full flex items-center gap-3 text-xl font-bold mb-6 group"
              >
                <motion.div
                  animate={{ rotate: isAllExpanded ? 0 : -90 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <ChevronDown className="w-6 h-6 text-[var(--primary)]" />
                </motion.div>
                All Zones ({allZones.length})
              </button>
              <AnimatePresence initial={false}>
                {isAllExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-2">
                      {allZones.map(zone => (
                        <ZoneCard key={zone.id} zone={zone} onClick={() => handleOpenZone(zone)} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 w-full bg-[var(--bg-secondary)] border-t border-[var(--border)] py-4 px-4 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-4 sm:gap-8">
          <button onClick={() => setActivePopup('dmca')} className="text-[var(--primary)] font-semibold hover:bg-[var(--primary-light)] px-3 py-1 rounded-[var(--radius)] transition-all">DMCA</button>
          <button onClick={() => setActivePopup('contact')} className="text-[var(--primary)] font-semibold hover:bg-[var(--primary-light)] px-3 py-1 rounded-[var(--radius)] transition-all">Contact</button>
          <button onClick={() => setActivePopup('privacy')} className="text-[var(--primary)] font-semibold hover:bg-[var(--primary-light)] px-3 py-1 rounded-[var(--radius)] transition-all">Privacy Policy</button>
          <button onClick={exportData} className="text-[var(--primary)] font-semibold hover:bg-[var(--primary-light)] px-3 py-1 rounded-[var(--radius)] transition-all">Export Data</button>
          <label className="text-[var(--primary)] font-semibold hover:bg-[var(--primary-light)] px-3 py-1 rounded-[var(--radius)] transition-all cursor-pointer">
            Import Data
            <input type="file" className="hidden" onChange={importData} accept=".json,.data" />
          </label>
        </div>
      </footer>

      {/* Zone Viewer Overlay */}
      <AnimatePresence>
        {activeZone && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-[var(--bg)] flex flex-col"
          >
            <div className="bg-[var(--gradient-primary)] text-white px-6 py-3 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-4 min-w-0">
                <h2 className="text-xl font-bold truncate">{activeZone.name}</h2>
                <button 
                  className="p-1 hover:bg-white/10 rounded-full transition-all"
                  onClick={() => setActivePopup('info')}
                >
                  <Info className="w-5 h-5" />
                </button>
                <div className="hidden sm:block text-white/80 text-sm font-medium truncate">
                  by {activeZone.authorLink ? (
                    <a href={activeZone.authorLink} target="_blank" className="hover:text-white underline">{activeZone.author}</a>
                  ) : activeZone.author}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleFullscreen} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-[var(--radius)] transition-all text-sm font-bold border border-white/30">
                  <Maximize2 className="w-4 h-4" /> Fullscreen
                </button>
                <button onClick={handleNewTab} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-[var(--radius)] transition-all text-sm font-bold border border-white/30">
                  <ExternalLink className="w-4 h-4" /> New Tab
                </button>
                <button onClick={handleDownload} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-[var(--radius)] transition-all text-sm font-bold border border-white/30">
                  <Download className="w-4 h-4" /> Download
                </button>
                <button onClick={handleCloseZone} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-[var(--radius)] transition-all text-sm font-bold border border-white/30">
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </div>
            <div className="flex-1 bg-black flex items-center justify-center">
              <iframe 
                ref={iframeRef}
                id="zoneFrame" 
                className="w-full h-full border-none"
                title={activeZone.name}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popups */}
      <AnimatePresence>
        {activePopup && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setActivePopup(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden border border-[var(--border)]"
            >
              <div className="bg-[var(--gradient-primary)] text-white px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  {activePopup === 'settings' && 'Settings'}
                  {activePopup === 'dmca' && 'DMCA'}
                  {activePopup === 'contact' && 'Contact'}
                  {activePopup === 'privacy' && 'Privacy Policy'}
                  {activePopup === 'cloak' && 'Tab Cloak'}
                  {activePopup === 'info' && activeZone?.name + ' Info'}
                </h3>
                <button onClick={() => setActivePopup(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-[var(--radius)] transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {activePopup === 'settings' && (
                  <div className="space-y-4">
                    <button 
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="w-full py-4 px-6 bg-[var(--gradient-primary)] text-white rounded-[var(--radius)] font-bold shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
                    >
                      {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                      Toggle {isDarkMode ? 'Light' : 'Dark'} Mode
                    </button>
                    <button 
                      onClick={() => setActivePopup('cloak')}
                      className="w-full py-4 px-6 bg-[var(--gradient-primary)] text-white rounded-[var(--radius)] font-bold shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
                    >
                      <Shield className="w-5 h-5" /> Tab Cloak
                    </button>
                  </div>
                )}

                {activePopup === 'cloak' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="font-bold text-sm uppercase tracking-wider text-[var(--text-muted)]">Set Tab Title</label>
                      <input 
                        type="text" 
                        placeholder="Enter new tab name..." 
                        className="w-full p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius)] outline-none focus:border-[var(--primary)] transition-all"
                        value={tabTitle}
                        onChange={(e) => setTabTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-bold text-sm uppercase tracking-wider text-[var(--text-muted)]">Set Tab Icon URL</label>
                      <input 
                        type="text" 
                        placeholder="Enter new tab icon URL..." 
                        className="w-full p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius)] outline-none focus:border-[var(--primary)] transition-all"
                        value={tabIcon}
                        onChange={(e) => setTabIcon(e.target.value)}
                      />
                    </div>
                    <button onClick={() => setActivePopup('settings')} className="w-full py-3 text-[var(--primary)] font-bold hover:bg-[var(--primary-light)] rounded-[var(--radius)] transition-all">Back to Settings</button>
                  </div>
                )}

                {activePopup === 'dmca' && (
                  <div className="space-y-4 text-[var(--text)]">
                    <p>If you own or developed a game that is on <strong>gn-math</strong> and would like it removed, please do one of the following:</p>
                    <div className="space-y-4">
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-[var(--radius)] border border-[var(--border)] flex items-start gap-4">
                        <div className="p-2 bg-[var(--primary-light)] rounded-lg text-[var(--primary)]"><Shield className="w-6 h-6" /></div>
                        <div>
                          <p className="font-bold">Join the Discord</p>
                          <p className="text-sm text-[var(--text-muted)]">DM breadbb or ping in a public channel for instant response.</p>
                          <a href="https://discord.gg/D4c9VFYWyU" target="_blank" className="text-[var(--primary)] font-bold hover:underline">Discord Link</a>
                        </div>
                      </div>
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-[var(--radius)] border border-[var(--border)] flex items-start gap-4">
                        <div className="p-2 bg-[var(--primary-light)] rounded-lg text-[var(--primary)]"><Mail className="w-6 h-6" /></div>
                        <div>
                          <p className="font-bold">Email Us</p>
                          <p className="text-sm text-[var(--text-muted)]">Subject starting with !DMCA. Delayed response.</p>
                          <a href="mailto:gn.math.business@gmail.com" className="text-[var(--primary)] font-bold hover:underline">gn.math.business@gmail.com</a>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm italic text-[var(--text-muted)]">Please show proof of ownership in your request.</p>
                  </div>
                )}

                {activePopup === 'contact' && (
                  <div className="space-y-4 text-[var(--text)]">
                    <div className="p-4 bg-[var(--bg-secondary)] rounded-[var(--radius)] border border-[var(--border)] space-y-2">
                      <p className="flex items-center gap-3"><span className="font-bold">Discord:</span> <a href="https://discord.gg/NAFw4ykZ7n" target="_blank" className="text-[var(--primary)] hover:underline">Join our server</a></p>
                      <p className="flex items-center gap-3"><span className="font-bold">Email:</span> <a href="mailto:gn.math.business@gmail.com" className="text-[var(--primary)] hover:underline">gn.math.business@gmail.com</a></p>
                    </div>
                  </div>
                )}

                {activePopup === 'privacy' && (
                  <div className="space-y-4 text-[var(--text)] text-sm leading-relaxed">
                    <h4 className="font-bold text-lg">PRIVACY POLICY</h4>
                    <p>Last updated February 20, 2026</p>
                    <p>This Privacy Notice for gn-math ("we," "us," or "our"), describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services.</p>
                    <div className="space-y-2">
                      <p className="font-bold">Summary of Key Points</p>
                      <p>We process your information to provide, improve, and administer our Services. We do not collect sensitive personal information or information from third parties.</p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-bold">How do we keep your information safe?</p>
                      <p>We have adequate organizational and technical processes in place to protect your personal information. However, no electronic transmission over the internet can be guaranteed to be 100% secure.</p>
                    </div>
                  </div>
                )}

                {activePopup === 'info' && activeZone && (
                  <div className="space-y-4 text-[var(--text)]">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase">ID</p>
                        <p className="font-medium">{activeZone.id}</p>
                      </div>
                      <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase">Name</p>
                        <p className="font-medium">{activeZone.name}</p>
                      </div>
                      <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase">Author</p>
                        <p className="font-medium">{activeZone.author}</p>
                      </div>
                      <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase">Plays (Yearly)</p>
                        <p className="font-medium">{(popularityData.year[activeZone.id] || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    {activeZone.special && (
                      <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {activeZone.special.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-[var(--primary-light)] text-[var(--primary)] text-xs font-bold rounded-md">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ZoneCardProps {
  zone: Zone;
  onClick: () => void | Promise<void>;
  key?: React.Key;
}

function ZoneCard({ zone, onClick }: ZoneCardProps) {
  const coverImg = zone.cover.replace("{COVER_URL}", COVER_URL).replace("{HTML_URL}", HTML_URL);

  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      className="bg-[var(--gradient-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden cursor-pointer shadow-sm hover:shadow-xl hover:border-[var(--primary)] transition-all group relative"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-[var(--primary-light)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />
      <div className="aspect-square overflow-hidden bg-[var(--border-light)]">
        <img 
          src={coverImg} 
          alt={zone.name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>
      <div className="p-4 flex items-center justify-center min-h-[70px] relative z-20">
        <span className="text-sm font-bold text-center group-hover:text-[var(--primary)] transition-colors line-clamp-2">
          {zone.name}
        </span>
      </div>
    </motion.div>
  );
}
