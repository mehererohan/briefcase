import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactMarkdown from 'react-markdown';
import { searchWeb } from '../lib/tavily';
import { searchExa } from '../lib/exa';
import { enrichCompany } from '../lib/companylens';
import { checkBreachHistory } from '../lib/supabase';
import { callGemini } from '../lib/gemini';
import { OASIS_SYSTEM_PROMPT, buildBriefingPrompt } from '../lib/prompts';
import { logProspectToSheets, signOutGoogle } from '../lib/sheets';

const MEETING_TYPES = ['Cold Outreach', 'Follow-up', 'Discovery Call', 'Product Demo'];
const HISTORY_KEY = 'briefcase-history';
const HISTORY_LIMIT = 50;
const LOADING_MESSAGES = [
  'Searching the web...',
  'Enriching company data...',
  'Checking breach records...',
  'Building your briefing...',
];

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
}

function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function extractSection(text, heading) {
  const lines = text.split('\n');
  let capturing = false;
  const content = [];

  for (const line of lines) {
    const isHeader = /^#{1,6}\s/.test(line);
    if (isHeader && line.toLowerCase().includes(heading.toLowerCase())) {
      capturing = true;
      continue;
    }
    if (capturing) {
      if (isHeader) break;
      content.push(line);
    }
  }

  return content.join('\n').trim();
}

const AutocompleteInput = forwardRef(function AutocompleteInput(
  { value, onChange, placeholder, storageKey, required },
  ref
) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    save() {
      if (!value.trim()) return;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!existing.includes(value.trim())) {
        localStorage.setItem(
          storageKey,
          JSON.stringify([value.trim(), ...existing].slice(0, 100))
        );
      }
    },
  }));

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleChange(e) {
    onChange(e);
    const val = e.target.value;
    if (val.length >= 1) {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const filtered = stored
        .filter(s => s.toLowerCase().includes(val.toLowerCase()))
        .slice(0, 5);
      setSuggestions(filtered);
      setOpen(filtered.length > 0);
    } else {
      setOpen(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') setOpen(false);
  }

  function handleSelect(suggestion) {
    onChange({ target: { value: suggestion } });
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
      />
      {open && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); handleSelect(s); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-slate-100 transition-colors"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="mt-4 w-full py-2 rounded-lg border border-blue-400 text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors"
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}

const COPYABLE_SECTIONS = [
  { heading: 'LinkedIn Connection Note', label: 'Copy LinkedIn Note' },
  { heading: 'Cold Email Draft', label: 'Copy Email Draft' },
];

function BriefingResult({ result, onSaveToSheets, savingToSheets, savedToSheets, sheetsError }) {
  const sectionTexts = COPYABLE_SECTIONS.reduce((acc, { heading }) => {
    acc[heading] = extractSection(result, heading);
    return acc;
  }, {});

  const lines = result.split('\n');
  const chunks = [];
  let current = { heading: null, lines: [] };

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,6}\s+(.*)/);
    if (headerMatch) {
      if (current.lines.length) chunks.push({ ...current });
      current = { heading: headerMatch[1].trim(), lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length) chunks.push({ ...current });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">Briefing</h3>
      <div className="prose prose-slate prose-sm max-w-none">
        {chunks.map((chunk, i) => {
          const copyable = COPYABLE_SECTIONS.find(s =>
            chunk.heading?.toLowerCase().includes(s.heading.toLowerCase())
          );
          return (
            <div key={i}>
              <ReactMarkdown>{chunk.lines.join('\n')}</ReactMarkdown>
              {copyable && sectionTexts[copyable.heading] && (
                <CopyButton text={sectionTexts[copyable.heading]} label={copyable.label} />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={onSaveToSheets}
          disabled={savingToSheets || savedToSheets}
          className={`w-full py-3 rounded-lg text-white text-sm font-medium transition-colors disabled:cursor-not-allowed ${
            savedToSheets
              ? 'bg-green-400 cursor-default'
              : 'bg-[#16a34a] hover:bg-green-700 disabled:opacity-60'
          }`}
        >
          {savingToSheets ? 'Saving...' : savedToSheets ? 'Saved to Sheets ✓' : 'Save to Sheets'}
        </button>
        {sheetsError && <p className="mt-2 text-red-600 text-sm">{sheetsError}</p>}
      </div>
    </div>
  );
}

export default function Module1() {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [meetingType, setMeetingType] = useState(MEETING_TYPES[0]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [savedToSheets, setSavedToSheets] = useState(false);
  const [savingToSheets, setSavingToSheets] = useState(false);
  const [sheetsError, setSheetsError] = useState('');
  const [history, setHistory] = useState(loadHistory);
  const mainRef = useRef(null);
  const nameRef = useRef(null);
  const titleRef = useRef(null);
  const companyRef = useRef(null);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    if (!loading) {
      setLoadingMessage('');
      return;
    }
    let i = 0;
    setLoadingMessage(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[i]);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult('');
    setError('');

    try {
      const [t1, t2, t3, t4] = await Promise.all([
        searchWeb(`${name} ${title} ${company}`).catch(() => []),
        searchWeb(`"${company}" remote work contractor security`).catch(() => []),
        searchWeb(`"${company}" news 2025 2026`).catch(() => []),
        searchWeb(`"${company}" data breach security incident`).catch(() => []),
      ]);

      const [e1, e2] = await Promise.all([
        searchExa(`${name} article podcast blog`).catch(() => []),
        searchExa(`${company} security engineering blog`).catch(() => []),
      ]);

      const domainGuess = company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
      const [companyData, breachRecords] = await Promise.all([
        Promise.race([
          enrichCompany(domainGuess),
          new Promise((resolve) => setTimeout(() => resolve(null), 5000))
        ]).catch(() => null),
        checkBreachHistory(company).catch(() => []),
      ]);

      const tavilyResults = [...t1, ...t2, ...t3, ...t4];
      tavilyResults.forEach(r => { if (r.content) r.content = r.content.slice(0, 400); });
      console.log('Tavily results:', tavilyResults.length);

      const exaResults = [...e1, ...e2];
      exaResults.forEach(r => { if (r.text) r.text = r.text.slice(0, 400); });
      console.log('Exa results:', exaResults.length);

      console.log('Company data:', companyData);
      console.log('Breach records:', breachRecords.length);

      const userMessage = buildBriefingPrompt({ name, title, company, meetingType, tavilyResults, exaResults, companyData, breachRecords });
      console.log('Sending to Gemini, prompt length:', userMessage.length);
      const briefing = await Promise.race([
        callGemini(OASIS_SYSTEM_PROMPT, userMessage),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out after 45 seconds. Please try again.')), 45000)),
      ]);

      nameRef.current?.save();
      titleRef.current?.save();
      companyRef.current?.save();

      const entry = {
        id: Date.now(),
        name,
        title,
        company,
        meetingType,
        result: briefing,
        timestamp: new Date().toISOString(),
      };

      setHistory(prev => [entry, ...prev].slice(0, HISTORY_LIMIT));
      setResult(briefing);
      setSavedToSheets(false);
      setSheetsError('');
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveToSheets() {
    setSavingToSheets(true);
    setSheetsError('');
    setSavedToSheets(false);

    try {
      const icpMatch = result.match(/(\d(?:\.\d)?)\s*\/\s*5/);
      const icpScore = icpMatch ? icpMatch[1] + '/5' : 'N/A';
      const linkedinNote = extractSection(result, 'LinkedIn Connection Note');
      const coldEmail = extractSection(result, 'Cold Email Draft');

      await logProspectToSheets({
        name,
        title,
        company,
        meetingType,
        icpScore,
        linkedinNote,
        coldEmail,
        status: 'Ready to Send',
        dateAdded: new Date().toISOString().split('T')[0],
      });

      setSavedToSheets(true);
    } catch (err) {
      setSheetsError(err.message || 'Failed to save to Sheets.');
    } finally {
      setSavingToSheets(false);
    }
  }

  function loadFromHistory(entry) {
    setName(entry.name);
    setTitle(entry.title);
    setCompany(entry.company);
    setMeetingType(entry.meetingType);
    setResult(entry.result);
    setError('');
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-[#0f172a] px-8 py-5 flex-shrink-0">
        <h1 className="text-2xl font-bold text-white tracking-tight">Briefcase</h1>
        <p className="text-slate-400 text-sm mt-0.5">GTM intelligence for modern sales teams</p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className="flex-shrink-0 overflow-y-auto"
          style={{ width: 280, background: '#0f172a' }}
        >
          <div className="px-4 pt-5 pb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">History</p>
          </div>
          {history.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-600">No briefings yet.</p>
          ) : (
            <ul>
              {history.map(entry => (
                <li key={entry.id}>
                  <button
                    onClick={() => loadFromHistory(entry)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors border-b border-slate-800"
                  >
                    <p className="text-sm text-slate-200 font-medium truncate">
                      {entry.name} · {entry.company}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{entry.meetingType}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{formatTimestamp(entry.timestamp)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main ref={mainRef} className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Prospect Briefing Generator</h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <AutocompleteInput
                    ref={nameRef}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Sarah Chen"
                    storageKey="briefcase-names"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <AutocompleteInput
                    ref={titleRef}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Head of IT Security"
                    storageKey="briefcase-titles"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <AutocompleteInput
                    ref={companyRef}
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    storageKey="briefcase-companies"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Type</label>
                  <select
                    value={meetingType}
                    onChange={e => setMeetingType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white"
                  >
                    {MEETING_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0f172a] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg px-4 py-3 transition-colors"
                >
                  {loading ? 'Generating…' : 'Generate Briefing'}
                </button>
              </form>
            </div>

            {loading && (
              <div className="flex flex-col items-center py-8 gap-3">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
                {loadingMessage && <p className="text-sm text-gray-500">{loadingMessage}</p>}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {result && !loading && (
              <BriefingResult
                result={result}
                onSaveToSheets={handleSaveToSheets}
                savingToSheets={savingToSheets}
                savedToSheets={savedToSheets}
                sheetsError={sheetsError}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
