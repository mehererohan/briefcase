import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactMarkdown from 'react-markdown';
import { callGemini } from '../lib/gemini';
import { OASIS_SYSTEM_PROMPT } from '../lib/prompts';
import { AppHeader } from '../App';

const LOADING_MESSAGES = [
  'Reading your notes...',
  'Identifying pain points...',
  'Spotting buying signals...',
  'Drafting CRM summary...',
];

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

function DebriefResult({ result }) {
  const crmSummary = extractSection(result, 'CRM-Ready Summary');

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
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">Call Debrief</h3>
      <div className="prose prose-slate prose-sm max-w-none">
        {chunks.map((chunk, i) => {
          const isCRM = chunk.heading?.toLowerCase().includes('crm-ready summary');
          return (
            <div key={i}>
              <ReactMarkdown>{chunk.lines.join('\n')}</ReactMarkdown>
              {isCRM && crmSummary && (
                <CopyButton text={crmSummary} label="Copy CRM Summary" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Module3() {
  const [prospectName, setProspectName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [callDate, setCallDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

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
    if (!notes.trim()) {
      setError('Please paste your call notes before generating a debrief.');
      return;
    }
    setLoading(true);
    setResult('');
    setError('');

    const userMessage = `You are analyzing discovery call notes from a sales call with ${prospectName}, ${role} at ${company} on ${callDate}.

RAW CALL NOTES:
${notes}

Generate a structured discovery call debrief with exactly these sections:

1. Call Summary — 2-3 sentences capturing the essence of the conversation, the prospect's current situation, and the overall tone of the call
2. Pain Points Surfaced — a bulleted list of specific pain points the prospect mentioned or implied, with a brief note on severity (High/Medium/Low) based on how much emphasis they placed on it
3. Buying Signals — a bulleted list of things the prospect said or asked that indicate genuine interest, urgency, or intent to evaluate. If none detected, say so honestly.
4. Objections Raised — a bulleted list of concerns, hesitations, or pushback the prospect expressed, with a suggested response to each
5. Agreed Next Steps — a clear bulleted list of what was agreed at the end of the call, with who is responsible for each action
6. CRM-Ready Summary — a single clean paragraph (4-6 sentences) written in third person that summarizes the call, suitable for pasting directly into a CRM. Include the prospect name, company, role, date, key pain points, next steps, and overall deal stage assessment.

Be specific and grounded in what the notes actually say. Do not invent details not present in the notes. If the notes are thin on a particular section, say so briefly.`;

    try {
      const debrief = await callGemini(OASIS_SYSTEM_PROMPT, userMessage);
      setResult(debrief);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-[800px] mx-auto px-6 py-10 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Discovery Call Debrief</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prospect Name</label>
                <AutocompleteInput
                  value={prospectName}
                  onChange={e => setProspectName(e.target.value)}
                  placeholder="e.g. Sarah Chen"
                  storageKey="briefcase-names"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <AutocompleteInput
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  storageKey="briefcase-companies"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <AutocompleteInput
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="e.g. Head of IT Security"
                  storageKey="briefcase-titles"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Call</label>
                <input
                  type="date"
                  value={callDate}
                  onChange={e => setCallDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Call Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Paste your raw call notes here — bullet points, fragments, and messy notes are fine..."
                rows={8}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0f172a] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg px-4 py-3 transition-colors"
            >
              {loading ? 'Generating…' : 'Generate Debrief'}
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

        {result && !loading && <DebriefResult result={result} />}
      </main>
    </div>
  );
}
