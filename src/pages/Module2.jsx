import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactMarkdown from 'react-markdown';
import { callGemini } from '../lib/gemini';
import { OASIS_SYSTEM_PROMPT } from '../lib/prompts';
import { AppHeader } from '../App';

const PERSONAS = ['CISO', 'IT Admin', 'Solutions Architect', 'VP of Security', 'CFO', 'Procurement Manager'];

const LOADING_MESSAGES = [
  'Analyzing persona...',
  'Tailoring value proposition...',
  'Building objection responses...',
  'Finalizing pitch guide...',
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

export default function Module2() {
  const [company, setCompany] = useState('');
  const [persona, setPersona] = useState(PERSONAS[0]);
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
    setLoading(true);
    setResult('');
    setError('');

    const userMessage = `Generate a persona-based pitch guide for selling Oasis to a ${persona} at ${company}.

Generate a structured pitch guide with exactly these sections:

1. Persona Overview — how a ${persona} thinks, what they prioritize, what keeps them up at night, and how they evaluate new security vendors
2. Tailored Value Proposition — a specific Oasis pitch for a ${persona} at ${company}, referencing their likely environment and concerns
3. Key Talking Points — 5 bullet points written in the language a ${persona} uses, grounded in their priorities
4. Likely Objections and Responses — 4 common objections a ${persona} raises when evaluating enterprise browser security, with a suggested response to each
5. Language Guide — a list of phrases and terms that resonate with a ${persona} (use these) and a list of phrases to avoid (don't use these)

Be specific to the ${persona} role. Avoid generic sales language. Every point should reflect how this specific role thinks about security, budget, and vendor evaluation.`;

    try {
      const pitch = await callGemini(OASIS_SYSTEM_PROMPT, userMessage);
      setResult(pitch);
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
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Persona-Based Pitch Builder</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
              <select
                value={persona}
                onChange={e => setPersona(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white"
              >
                {PERSONAS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0f172a] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg px-4 py-3 transition-colors"
            >
              {loading ? 'Generating…' : 'Generate Pitch'}
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">Pitch Guide</h3>
            <div className="prose prose-slate prose-sm max-w-none">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
