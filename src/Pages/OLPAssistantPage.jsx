import { useState, useMemo, useRef, useEffect } from "react";
import olpData from "../data/olpData.json";

const TOPICS = Object.entries(olpData).map(([id, td]) => ({
  id,
  name: td.name,
  label: `${id} – ${td.name}`,
  count: td.questions.length,
})).sort((a, b) => a.id.localeCompare(b.id));

function highlight(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={styles.mark}>{part}</mark>
      : part
  );
}

export default function OLPAssistantPage() {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [searchQuery, setSearchQuery]     = useState("");
  const [expanded, setExpanded]           = useState({});
  const [topicSearch, setTopicSearch]     = useState("");
  const [isMobile, setIsMobile]           = useState(window.innerWidth < 768);
  const searchRef = useRef(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const showSidebar = !isMobile || !selectedTopic;
  const showMain    = !isMobile || !!selectedTopic;

  const filteredTopics = useMemo(() => {
    const q = topicSearch.trim().toLowerCase();
    if (!q) return TOPICS;
    return TOPICS.filter(t =>
      t.label.toLowerCase().includes(q) || t.id.includes(q)
    );
  }, [topicSearch]);

  const filteredQuestions = useMemo(() => {
    if (!selectedTopic) return [];
    const questions = olpData[selectedTopic.id]?.questions || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter(qObj =>
      qObj.q.toLowerCase().includes(q) ||
      qObj.options.some(o => o.text.toLowerCase().includes(q))
    );
  }, [selectedTopic, searchQuery]);

  function selectTopic(topic) {
    setSelectedTopic(topic);
    setSearchQuery("");
    setExpanded({});
    setTimeout(() => searchRef.current?.focus(), 100);
  }

  function backToTopics() {
    setSelectedTopic(null);
    setSearchQuery("");
    setExpanded({});
  }

  function toggleCard(idx) {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
  }

  function expandAll() {
    const all = {};
    filteredQuestions.forEach((_, i) => { all[i] = true; });
    setExpanded(all);
  }

  function collapseAll() { setExpanded({}); }

  const correctCount = (qObj) => qObj.options.filter(o => o.correct).length;

  return (
    <div style={styles.root}>

      {/* ── SIDEBAR ── */}
      {showSidebar && (
        <aside style={{
          ...styles.sidebar,
          width:    isMobile ? "100%" : 280,
          minWidth: isMobile ? "100%" : 280,
          borderRight: isMobile ? "none" : "1px solid #1e3a5f",
        }}>
          <div style={styles.sidebarHeader}>
            <div style={styles.sidebarTitle}>
              <span>📚</span>
              <span>OLP Topics</span>
            </div>
            <div style={styles.topicCount}>{TOPICS.length} topics</div>
          </div>

          <div style={styles.sidebarSearch}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              style={styles.sidebarInput}
              placeholder="Filter topics..."
              value={topicSearch}
              onChange={e => setTopicSearch(e.target.value)}
            />
            {topicSearch && (
              <button style={styles.clearBtn} onClick={() => setTopicSearch("")}>✕</button>
            )}
          </div>

          {isMobile && (
            <div style={styles.mobileStats}>
              <div style={styles.mobileStatItem}>
                <span style={styles.mobileStatNum}>{TOPICS.length}</span>
                <span style={styles.mobileStatLabel}>Topics</span>
              </div>
              <div style={styles.mobileStatDivider} />
              <div style={styles.mobileStatItem}>
                <span style={styles.mobileStatNum}>{TOPICS.reduce((s,t)=>s+t.count,0).toLocaleString()}</span>
                <span style={styles.mobileStatLabel}>Questions</span>
              </div>
              <div style={styles.mobileStatDivider} />
              <div style={styles.mobileStatItem}>
                <span style={styles.mobileStatNum}>4709</span>
                <span style={styles.mobileStatLabel}>Answers</span>
              </div>
            </div>
          )}

          <div style={styles.topicList}>
            {filteredTopics.length === 0 && (
              <div style={styles.noTopics}>No topics match</div>
            )}
            {filteredTopics.map(topic => (
              <button
                key={topic.id}
                style={{
                  ...styles.topicItem,
                  ...(selectedTopic?.id === topic.id ? styles.topicItemActive : {}),
                  padding: isMobile ? "13px 10px" : "9px 10px",
                }}
                onClick={() => selectTopic(topic)}
              >
                <div style={styles.topicItemCode}>{topic.id}</div>
                <div style={styles.topicItemName}>{topic.name}</div>
                <div style={styles.topicItemBadge}>{topic.count}</div>
                {isMobile && <span style={styles.mobileArrow}>›</span>}
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* ── MAIN ── */}
      {showMain && (
        <main style={{ ...styles.main, width: isMobile ? "100%" : undefined }}>

          {isMobile && selectedTopic && (
            <button style={styles.mobileBackBtn} onClick={backToTopics}>
              ← Topics
            </button>
          )}

          {!selectedTopic && !isMobile && (
            <div style={styles.emptyState}>
              <div style={{ fontSize: 48 }}>🧭</div>
              <div style={styles.emptyTitle}>Select a Topic</div>
              <div style={styles.emptyText}>Choose a topic from the left panel to browse questions and correct answers.</div>
              <div style={styles.statsRow}>
                <div style={styles.statBox}><div style={styles.statNum}>{TOPICS.length}</div><div style={styles.statLabel}>Topics</div></div>
                <div style={styles.statBox}><div style={styles.statNum}>{TOPICS.reduce((s,t)=>s+t.count,0).toLocaleString()}</div><div style={styles.statLabel}>Questions</div></div>
                <div style={styles.statBox}><div style={styles.statNum}>4709</div><div style={styles.statLabel}>Correct Answers</div></div>
              </div>
            </div>
          )}

          {selectedTopic && (
            <>
              <div style={styles.panelHeader}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={styles.panelTopicCode}>{selectedTopic.id}</div>
                  <div style={{ ...styles.panelTopicName, fontSize: isMobile ? 16 : 18 }}>
                    {selectedTopic.name}
                  </div>
                </div>
                <div style={styles.panelMeta}>
                  <span style={styles.metaBadge}>{selectedTopic.count} Qs</span>
                  {filteredQuestions.length !== selectedTopic.count && (
                    <span style={styles.metaBadgeGreen}>{filteredQuestions.length} found</span>
                  )}
                </div>
              </div>

              <div style={styles.searchBar}>
                <span style={styles.searchIcon}>🔍</span>
                <input
                  ref={searchRef}
                  style={styles.searchInput}
                  placeholder={`Search in ${selectedTopic.name}...`}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button style={styles.clearBtn} onClick={() => setSearchQuery("")}>✕</button>
                )}
              </div>

              {filteredQuestions.length > 0 && (
                <div style={styles.controlRow}>
                  <span style={styles.controlLabel}>
                    {filteredQuestions.length} question{filteredQuestions.length !== 1 ? "s" : ""}
                  </span>
                  <div style={styles.controlBtns}>
                    <button style={styles.ctrlBtn} onClick={expandAll}>Expand All</button>
                    <button style={styles.ctrlBtn} onClick={collapseAll}>Collapse All</button>
                  </div>
                </div>
              )}

              <div style={styles.questionList}>
                {filteredQuestions.length === 0 && (
                  <div style={styles.noResults}>
                    <div style={{ fontSize:36, marginBottom:8 }}>🔎</div>
                    <div>No questions match <strong>"{searchQuery}"</strong></div>
                    <div style={{ fontSize:12, color:"#475569" }}>Try a different keyword</div>
                  </div>
                )}

                {filteredQuestions.map((qObj, idx) => {
                  const isOpen = !!expanded[idx];
                  const multiAnswer = correctCount(qObj) > 1;
                  return (
                    <div key={idx} style={styles.card}>
                      <button style={styles.cardHeader} onClick={() => toggleCard(idx)}>
                        <div style={styles.cardHeaderLeft}>
                          <span style={styles.qNum}>Q{idx + 1}</span>
                          {multiAnswer && <span style={styles.multiBadge}>Multi</span>}
                        </div>
                        <div style={styles.qText}>{highlight(qObj.q, searchQuery)}</div>
                        <span style={styles.chevron}>{isOpen ? "▲" : "▼"}</span>
                      </button>

                      {isOpen && (
                        <div style={styles.cardBody}>
                          {qObj.options.map((opt, oi) => (
                            <div key={oi} style={{
                              ...styles.option,
                              ...(opt.correct ? styles.optionCorrect : styles.optionWrong),
                            }}>
                              <span style={opt.correct ? styles.optIconCorrect : styles.optIconWrong}>
                                {opt.correct ? "✓" : "○"}
                              </span>
                              <span style={styles.optText}>{highlight(opt.text, searchQuery)}</span>
                            </div>
                          ))}
                          {multiAnswer && (
                            <div style={styles.multiNote}>
                              ℹ️ This question has {correctCount(qObj)} correct answers
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      )}
    </div>
  );
}

const styles = {
  root: { display:"flex", height:"calc(100vh - 60px)", background:"#0b1120", fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#e2e8f0", overflow:"hidden" },
  sidebar: { background:"#0f1a2e", display:"flex", flexDirection:"column", overflow:"hidden" },
  sidebarHeader: { padding:"16px 14px 10px", borderBottom:"1px solid #1e3a5f", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 },
  sidebarTitle: { display:"flex", alignItems:"center", gap:8, fontSize:15, fontWeight:700, color:"#93c5fd" },
  topicCount: { fontSize:11, color:"#64748b", background:"#1e293b", padding:"2px 8px", borderRadius:10 },
  sidebarSearch: { padding:"10px 10px 8px", borderBottom:"1px solid #1e3a5f", display:"flex", alignItems:"center", gap:6, flexShrink:0 },
  sidebarInput: { flex:1, background:"#1e293b", border:"1px solid #2d4a6a", borderRadius:8, padding:"7px 10px", color:"#e2e8f0", fontSize:13, outline:"none" },
  searchIcon: { fontSize:14, color:"#64748b", flexShrink:0 },
  clearBtn: { background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:14, padding:"4px 6px", borderRadius:6, lineHeight:1, flexShrink:0 },
  mobileStats: { display:"flex", alignItems:"center", justifyContent:"space-around", padding:"10px 16px", borderBottom:"1px solid #1e3a5f", background:"#0a1628", flexShrink:0 },
  mobileStatItem: { display:"flex", flexDirection:"column", alignItems:"center", gap:2 },
  mobileStatNum: { fontSize:16, fontWeight:800, color:"#3b82f6" },
  mobileStatLabel: { fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 },
  mobileStatDivider: { width:1, height:28, background:"#1e3a5f" },
  topicList: { flex:1, overflowY:"auto", padding:"4px 6px" },
  noTopics: { color:"#64748b", fontSize:13, textAlign:"center", padding:"24px 0" },
  topicItem: { width:"100%", background:"transparent", border:"none", borderRadius:8, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:8, marginBottom:2, color:"#94a3b8" },
  topicItemActive: { background:"#1e3a5f", color:"#93c5fd" },
  topicItemCode: { fontSize:10, fontFamily:"monospace", background:"#1e293b", color:"#64748b", padding:"1px 5px", borderRadius:4, minWidth:36, textAlign:"center", flexShrink:0 },
  topicItemName: { flex:1, fontSize:13, lineHeight:1.3, textAlign:"left" },
  topicItemBadge: { fontSize:10, color:"#64748b", background:"#1e293b", padding:"1px 6px", borderRadius:10, minWidth:24, textAlign:"center", flexShrink:0 },
  mobileArrow: { fontSize:20, color:"#3b82f6", fontWeight:700, flexShrink:0 },
  main: { flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
  mobileBackBtn: { display:"inline-flex", alignItems:"center", gap:6, margin:"10px 12px 0", padding:"8px 14px", background:"#1e293b", border:"1px solid #2d4a6a", borderRadius:8, color:"#93c5fd", fontSize:13, fontWeight:600, cursor:"pointer", flexShrink:0, alignSelf:"flex-start" },
  emptyState: { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, padding:40, color:"#64748b" },
  emptyTitle: { fontSize:22, fontWeight:700, color:"#94a3b8" },
  emptyText: { fontSize:14, textAlign:"center", maxWidth:380, lineHeight:1.6 },
  statsRow: { display:"flex", gap:16, marginTop:20 },
  statBox: { background:"#0f1a2e", border:"1px solid #1e3a5f", borderRadius:12, padding:"16px 24px", textAlign:"center" },
  statNum: { fontSize:28, fontWeight:800, color:"#3b82f6" },
  statLabel: { fontSize:12, color:"#64748b", marginTop:4 },
  panelHeader: { padding:"14px 14px 10px", borderBottom:"1px solid #1e3a5f", background:"#0f1a2e", display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexShrink:0, gap:8 },
  panelTopicCode: { fontSize:11, color:"#3b82f6", fontFamily:"monospace", letterSpacing:1, marginBottom:3 },
  panelTopicName: { fontWeight:700, color:"#e2e8f0", wordBreak:"break-word" },
  panelMeta: { display:"flex", gap:6, alignItems:"center", flexShrink:0 },
  metaBadge: { background:"#1e293b", color:"#94a3b8", borderRadius:20, padding:"3px 10px", fontSize:11, border:"1px solid #2d4a6a", whiteSpace:"nowrap" },
  metaBadgeGreen: { background:"#052e16", color:"#4ade80", borderRadius:20, padding:"3px 10px", fontSize:11, border:"1px solid #166534", whiteSpace:"nowrap" },
  searchBar: { padding:"10px 14px", borderBottom:"1px solid #1e3a5f", display:"flex", alignItems:"center", gap:8, background:"#0f1a2e", flexShrink:0 },
  searchInput: { flex:1, background:"#1e293b", border:"1px solid #2d4a6a", borderRadius:10, padding:"8px 12px", color:"#e2e8f0", fontSize:14, outline:"none" },
  controlRow: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 14px", borderBottom:"1px solid #1e3a5f", background:"#0a1628", flexShrink:0 },
  controlLabel: { fontSize:12, color:"#64748b" },
  controlBtns: { display:"flex", gap:8 },
  ctrlBtn: { background:"#1e293b", border:"1px solid #2d4a6a", borderRadius:6, color:"#93c5fd", fontSize:11, padding:"4px 12px", cursor:"pointer" },
  questionList: { flex:1, overflowY:"auto", padding:"10px 12px 20px" },
  noResults: { textAlign:"center", color:"#64748b", padding:"60px 20px", fontSize:14, lineHeight:2 },
  card: { background:"#0f1a2e", border:"1px solid #1e3a5f", borderRadius:12, marginBottom:10, overflow:"hidden" },
  cardHeader: { width:"100%", background:"none", border:"none", cursor:"pointer", padding:"12px", display:"flex", alignItems:"flex-start", gap:8, textAlign:"left", color:"#e2e8f0" },
  cardHeaderLeft: { display:"flex", flexDirection:"column", gap:4, alignItems:"center", flexShrink:0 },
  qNum: { fontSize:10, color:"#3b82f6", background:"#1e3a5f", padding:"2px 6px", borderRadius:6, fontFamily:"monospace", fontWeight:700, whiteSpace:"nowrap" },
  multiBadge: { fontSize:8, color:"#fb923c", background:"#431407", padding:"2px 4px", borderRadius:4, border:"1px solid #7c2d12", whiteSpace:"nowrap" },
  qText: { flex:1, fontSize:13, lineHeight:1.6, color:"#cbd5e1" },
  chevron: { fontSize:10, color:"#475569", flexShrink:0, paddingTop:3 },
  cardBody: { padding:"4px 12px 12px", borderTop:"1px solid #1e3a5f", background:"#0a1628" },
  option: { display:"flex", alignItems:"flex-start", gap:10, padding:"8px 10px", borderRadius:8, margin:"6px 0" },
  optionCorrect: { background:"#052e16", border:"1px solid #166534" },
  optionWrong: { background:"#0f1a2e", border:"1px solid #1e293b" },
  optIconCorrect: { color:"#4ade80", fontWeight:800, fontSize:15, flexShrink:0, marginTop:1 },
  optIconWrong: { color:"#475569", fontSize:14, flexShrink:0, marginTop:1 },
  optText: { fontSize:13, lineHeight:1.5 },
  multiNote: { fontSize:11, color:"#fb923c", padding:"6px 10px", marginTop:4, background:"#1c0a00", borderRadius:6, border:"1px solid #431407" },
  mark: { background:"#854d0e", color:"#fef9c3", borderRadius:3, padding:"0 2px" },
};
