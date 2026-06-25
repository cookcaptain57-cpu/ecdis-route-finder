import { useState, useMemo, useRef } from "react";
import olpData from "../data/olpData.json";

// ── helpers ──────────────────────────────────────────────────────────────────

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

// ── main component ────────────────────────────────────────────────────────────

export default function OLPAssistantPage() {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [searchQuery, setSearchQuery]   = useState("");
  const [expanded, setExpanded]         = useState({});
  const [topicSearch, setTopicSearch]   = useState("");
  const searchRef = useRef(null);

  // filter topics in sidebar
  const filteredTopics = useMemo(() => {
    const q = topicSearch.trim().toLowerCase();
    if (!q) return TOPICS;
    return TOPICS.filter(t =>
      t.label.toLowerCase().includes(q) ||
      t.id.includes(q)
    );
  }, [topicSearch]);

  // search questions within selected topic
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

  function toggleCard(idx) {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
  }

  function expandAll() {
    const all = {};
    filteredQuestions.forEach((_, i) => { all[i] = true; });
    setExpanded(all);
  }

  function collapseAll() {
    setExpanded({});
  }

  const correctCount = (qObj) => qObj.options.filter(o => o.correct).length;

  return (
    <div style={styles.root}>

      {/* ── LEFT SIDEBAR ── */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarTitle}>
            <span style={styles.titleIcon}>📚</span>
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
              }}
              onClick={() => selectTopic(topic)}
            >
              <div style={styles.topicItemCode}>{topic.id}</div>
              <div style={styles.topicItemName}>{topic.name}</div>
              <div style={styles.topicItemBadge}>{topic.count}</div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <main style={styles.main}>

        {/* No topic selected */}
        {!selectedTopic && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🧭</div>
            <div style={styles.emptyTitle}>Select a Topic</div>
            <div style={styles.emptyText}>
              Choose a topic from the left panel to browse questions and correct answers.
            </div>
            <div style={styles.statsRow}>
              <div style={styles.statBox}>
                <div style={styles.statNum}>{TOPICS.length}</div>
                <div style={styles.statLabel}>Topics</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNum}>
                  {TOPICS.reduce((s, t) => s + t.count, 0).toLocaleString()}
                </div>
                <div style={styles.statLabel}>Questions</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNum}>4709</div>
                <div style={styles.statLabel}>Correct Answers</div>
              </div>
            </div>
          </div>
        )}

        {/* Topic selected */}
        {selectedTopic && (
          <>
            {/* Header */}
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.panelTopicCode}>{selectedTopic.id}</div>
                <div style={styles.panelTopicName}>{selectedTopic.name}</div>
              </div>
              <div style={styles.panelMeta}>
                <span style={styles.metaBadge}>{selectedTopic.count} questions</span>
                {filteredQuestions.length !== selectedTopic.count && (
                  <span style={styles.metaBadgeGreen}>
                    {filteredQuestions.length} found
                  </span>
                )}
              </div>
            </div>

            {/* Search bar */}
            <div style={styles.searchBar}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                ref={searchRef}
                style={styles.searchInput}
                placeholder={`Search within ${selectedTopic.name}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button style={styles.clearBtn} onClick={() => setSearchQuery("")}>✕</button>
              )}
            </div>

            {/* Expand / Collapse controls */}
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

            {/* Questions */}
            <div style={styles.questionList}>
              {filteredQuestions.length === 0 && (
                <div style={styles.noResults}>
                  <div style={styles.noResultsIcon}>🔎</div>
                  <div>No questions match <strong>"{searchQuery}"</strong></div>
                  <div style={styles.noResultsSub}>Try a different keyword</div>
                </div>
              )}

              {filteredQuestions.map((qObj, idx) => {
                const isOpen = !!expanded[idx];
                const multiAnswer = correctCount(qObj) > 1;
                return (
                  <div key={idx} style={styles.card}>
                    {/* Card Header */}
                    <button
                      style={styles.cardHeader}
                      onClick={() => toggleCard(idx)}
                    >
                      <div style={styles.cardHeaderLeft}>
                        <span style={styles.qNum}>Q{idx + 1}</span>
                        {multiAnswer && (
                          <span style={styles.multiBadge}>Multiple Answers</span>
                        )}
                      </div>
                      <div style={styles.qText}>
                        {highlight(qObj.q, searchQuery)}
                      </div>
                      <span style={styles.chevron}>
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </button>

                    {/* Card Body */}
                    {isOpen && (
                      <div style={styles.cardBody}>
                        {qObj.options.map((opt, oi) => (
                          <div
                            key={oi}
                            style={{
                              ...styles.option,
                              ...(opt.correct ? styles.optionCorrect : styles.optionWrong),
                            }}
                          >
                            <span style={opt.correct ? styles.optIconCorrect : styles.optIconWrong}>
                              {opt.correct ? "✓" : "○"}
                            </span>
                            <span style={styles.optText}>
                              {highlight(opt.text, searchQuery)}
                            </span>
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
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = {
  root: {
    display: "flex",
    height: "calc(100vh - 60px)",
    background: "#0b1120",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#e2e8f0",
    overflow: "hidden",
  },

  // Sidebar
  sidebar: {
    width: 280,
    minWidth: 280,
    background: "#0f1a2e",
    borderRight: "1px solid #1e3a5f",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  sidebarHeader: {
    padding: "16px 14px 10px",
    borderBottom: "1px solid #1e3a5f",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sidebarTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 15,
    fontWeight: 700,
    color: "#93c5fd",
    letterSpacing: 0.3,
  },
  titleIcon: { fontSize: 18 },
  topicCount: {
    fontSize: 11,
    color: "#64748b",
    background: "#1e293b",
    padding: "2px 8px",
    borderRadius: 10,
  },
  sidebarSearch: {
    position: "relative",
    padding: "10px 10px 8px",
    borderBottom: "1px solid #1e3a5f",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  sidebarInput: {
    flex: 1,
    background: "#1e293b",
    border: "1px solid #2d4a6a",
    borderRadius: 8,
    padding: "6px 28px 6px 10px",
    color: "#e2e8f0",
    fontSize: 12,
    outline: "none",
  },
  topicList: {
    flex: 1,
    overflowY: "auto",
    padding: "4px 6px",
  },
  noTopics: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    padding: "24px 0",
  },
  topicItem: {
    width: "100%",
    background: "transparent",
    border: "none",
    borderRadius: 8,
    padding: "9px 10px",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
    transition: "background 0.15s",
    color: "#94a3b8",
  },
  topicItemActive: {
    background: "#1e3a5f",
    color: "#93c5fd",
  },
  topicItemCode: {
    fontSize: 10,
    fontFamily: "monospace",
    background: "#1e293b",
    color: "#64748b",
    padding: "1px 5px",
    borderRadius: 4,
    minWidth: 36,
    textAlign: "center",
  },
  topicItemName: {
    flex: 1,
    fontSize: 12,
    lineHeight: 1.3,
  },
  topicItemBadge: {
    fontSize: 10,
    color: "#64748b",
    background: "#1e293b",
    padding: "1px 6px",
    borderRadius: 10,
    minWidth: 24,
    textAlign: "center",
  },

  // Main panel
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  // Empty state
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 40,
    color: "#64748b",
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 22, fontWeight: 700, color: "#94a3b8" },
  emptyText: { fontSize: 14, textAlign: "center", maxWidth: 380, lineHeight: 1.6 },
  statsRow: {
    display: "flex",
    gap: 16,
    marginTop: 20,
  },
  statBox: {
    background: "#0f1a2e",
    border: "1px solid #1e3a5f",
    borderRadius: 12,
    padding: "16px 24px",
    textAlign: "center",
  },
  statNum: { fontSize: 28, fontWeight: 800, color: "#3b82f6" },
  statLabel: { fontSize: 12, color: "#64748b", marginTop: 4 },

  // Panel header
  panelHeader: {
    padding: "16px 20px 12px",
    borderBottom: "1px solid #1e3a5f",
    background: "#0f1a2e",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexShrink: 0,
  },
  panelTopicCode: {
    fontSize: 11,
    color: "#3b82f6",
    fontFamily: "monospace",
    letterSpacing: 1,
    marginBottom: 3,
  },
  panelTopicName: {
    fontSize: 18,
    fontWeight: 700,
    color: "#e2e8f0",
  },
  panelMeta: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexShrink: 0,
  },
  metaBadge: {
    background: "#1e293b",
    color: "#94a3b8",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 12,
    border: "1px solid #2d4a6a",
  },
  metaBadgeGreen: {
    background: "#052e16",
    color: "#4ade80",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 12,
    border: "1px solid #166534",
  },

  // Search bar in main
  searchBar: {
    padding: "12px 20px",
    borderBottom: "1px solid #1e3a5f",
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#0f1a2e",
    flexShrink: 0,
  },
  searchIcon: { fontSize: 14, color: "#64748b" },
  searchInput: {
    flex: 1,
    background: "#1e293b",
    border: "1px solid #2d4a6a",
    borderRadius: 10,
    padding: "8px 14px",
    color: "#e2e8f0",
    fontSize: 14,
    outline: "none",
  },
  clearBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    fontSize: 14,
    padding: "4px 6px",
    borderRadius: 6,
    lineHeight: 1,
  },

  // Controls row
  controlRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 20px",
    borderBottom: "1px solid #1e3a5f",
    background: "#0a1628",
    flexShrink: 0,
  },
  controlLabel: { fontSize: 12, color: "#64748b" },
  controlBtns: { display: "flex", gap: 8 },
  ctrlBtn: {
    background: "#1e293b",
    border: "1px solid #2d4a6a",
    borderRadius: 6,
    color: "#93c5fd",
    fontSize: 11,
    padding: "4px 12px",
    cursor: "pointer",
  },

  // Question list
  questionList: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 16px 20px",
  },

  // No results
  noResults: {
    textAlign: "center",
    color: "#64748b",
    padding: "60px 20px",
    fontSize: 14,
    lineHeight: 2,
  },
  noResultsIcon: { fontSize: 36, marginBottom: 8 },
  noResultsSub: { fontSize: 12, color: "#475569" },

  // Question card
  card: {
    background: "#0f1a2e",
    border: "1px solid #1e3a5f",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    transition: "border-color 0.15s",
  },
  cardHeader: {
    width: "100%",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "12px 14px",
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    textAlign: "left",
    color: "#e2e8f0",
  },
  cardHeaderLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    alignItems: "center",
    flexShrink: 0,
  },
  qNum: {
    fontSize: 10,
    color: "#3b82f6",
    background: "#1e3a5f",
    padding: "2px 6px",
    borderRadius: 6,
    fontFamily: "monospace",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  multiBadge: {
    fontSize: 9,
    color: "#fb923c",
    background: "#431407",
    padding: "2px 5px",
    borderRadius: 4,
    border: "1px solid #7c2d12",
    whiteSpace: "nowrap",
  },
  qText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 1.6,
    color: "#cbd5e1",
  },
  chevron: {
    fontSize: 10,
    color: "#475569",
    flexShrink: 0,
    paddingTop: 3,
  },

  // Card body
  cardBody: {
    padding: "4px 14px 14px 14px",
    borderTop: "1px solid #1e3a5f",
    background: "#0a1628",
  },
  option: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 8,
    margin: "6px 0",
  },
  optionCorrect: {
    background: "#052e16",
    border: "1px solid #166534",
  },
  optionWrong: {
    background: "#0f1a2e",
    border: "1px solid #1e293b",
  },
  optIconCorrect: {
    color: "#4ade80",
    fontWeight: 800,
    fontSize: 15,
    flexShrink: 0,
    marginTop: 1,
  },
  optIconWrong: {
    color: "#475569",
    fontSize: 14,
    flexShrink: 0,
    marginTop: 1,
  },
  optText: {
    fontSize: 13,
    lineHeight: 1.5,
  },
  multiNote: {
    fontSize: 11,
    color: "#fb923c",
    padding: "6px 12px",
    marginTop: 4,
    background: "#1c0a00",
    borderRadius: 6,
    border: "1px solid #431407",
  },

  // Highlight mark
  mark: {
    background: "#854d0e",
    color: "#fef9c3",
    borderRadius: 3,
    padding: "0 2px",
  },
};
