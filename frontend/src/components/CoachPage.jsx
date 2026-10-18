import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ErrorBanner from './ErrorBanner';
import { getFriendlyError } from '../utils/friendlyError';
import { PATHS } from '../utils/paths';
import { savePendingGoal } from '../utils/pendingGoal';

const STARTERS = [
  'Am I on track this month?',
  'Which goal should I prioritize?',
  'Help me catch up on what’s behind.',
  'Suggest a savings plan for a trip in 6 months.',
];

function CoachPage({ user, onGoalDraft }) {
  const navigate = useNavigate();
  const listRef = useRef(null);
  const [status, setStatus] = useState({ configured: null, model: null, provider: null });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/ai/status')
      .then((response) => {
        if (!cancelled) setStatus(response.data);
      })
      .catch(() => {
        if (!cancelled) setStatus({ configured: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const content = String(text || '').trim();
    if (!content || loading) return;

    setError(null);
    setDraft(null);
    const nextHistory = [...messages, { role: 'user', content }];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai/coach', {
        messages: nextHistory,
      });
      const reply = response.data.reply || 'I could not form a reply. Try again.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      if (response.data.goal_draft) {
        setDraft(response.data.goal_draft);
      }
    } catch (err) {
      setError(getFriendlyError(err, 'Coach is unavailable right now. Check HF_TOKEN on the server.'));
      setMessages((prev) => prev.slice(0, -1));
      setInput(content);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  const applyDraft = () => {
    if (!draft) return;
    const payload = {
      name: draft.name || 'New goal',
      targetAmount: draft.target_amount,
      deadline: draft.deadline,
    };
    savePendingGoal(payload, { allowPartial: true });
    onGoalDraft?.(draft);
    navigate(PATHS.savings);
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col gap-5">
      <section>
        <p className="eyebrow">Guidance</p>
        <h2 className="page-title">QUANT Coach</h2>
        <p className="page-lede">
          Ask about your goals in plain language. Numbers come from your ledger —
          the coach never moves money without you.
        </p>
        {status.configured && (
          <p className="mt-2 font-sans text-xs text-taupe">
            Model: {status.model || 'configured'} ({status.provider || 'huggingface'})
          </p>
        )}
      </section>

      {status.configured === false && (
        <ErrorBanner message="AI coach is not configured. Add HF_TOKEN to backend/.env and restart the API." />
      )}

      {error && <ErrorBanner message={error} />}

      <section className="surface flex min-h-[420px] flex-1 flex-col overflow-hidden">
        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="font-serif text-xl font-light text-primary-dark">
                Hello{user?.first_name ? `, ${user.first_name}` : ''}.
              </p>
              <p className="font-sans text-sm text-taupe">
                Try one of these, or type your own question.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {STARTERS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={loading || status.configured === false}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-lg border border-primary-dark/10 bg-cream/60 px-3 py-2 text-left font-sans text-xs text-primary-dark transition-colors hover:bg-cream disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((item, index) => (
            <div
              key={`${item.role}-${index}`}
              className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 font-sans text-sm leading-relaxed ${
                  item.role === 'user'
                    ? 'bg-primary-dark text-cream'
                    : 'border border-primary-dark/10 bg-cream/70 text-primary-dark'
                }`}
              >
                <p className="whitespace-pre-wrap">{item.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <p className="font-sans text-sm text-taupe">Coach is thinking…</p>
          )}
        </div>

        {draft && (draft.name || draft.target_amount || draft.deadline) && (
          <div className="border-t border-primary-dark/10 bg-cream/40 px-4 py-3 sm:px-5">
            <p className="font-sans text-xs uppercase tracking-[0.12em] text-taupe">
              Suggested goal draft
            </p>
            <p className="mt-1 font-sans text-sm text-primary-dark">
              {draft.name || 'Untitled'}
              {draft.target_amount != null ? ` · ${draft.target_amount}` : ''}
              {draft.deadline ? ` · by ${draft.deadline}` : ''}
            </p>
            <button
              type="button"
              onClick={applyDraft}
              className="btn-navy mt-3 min-h-[40px] text-sm"
            >
              Review on Savings Goals
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex gap-2 border-t border-primary-dark/10 p-3 sm:p-4"
        >
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about your goals…"
            disabled={loading || status.configured === false}
            className="field min-h-[44px] flex-1"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || status.configured === false}
            className="btn-navy min-h-[44px] shrink-0 px-4 disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </section>
    </div>
  );
}

export default CoachPage;
