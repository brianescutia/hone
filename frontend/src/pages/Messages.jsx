import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ReportButton from '../components/ReportButton.jsx';

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [convos, setConvos] = useState([]);
  const [activeId, setActiveId] = useState(params.get('c'));
  const [active, setActive] = useState(null);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingActive, setLoadingActive] = useState(false);

  useEffect(() => {
    api
      .get('/conversations')
      .then((d) => {
        setConvos(d.conversations);
        if (!activeId && d.conversations[0]) setActiveId(d.conversations[0]._id);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoadingList(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) {
      setActive(null);
      return;
    }
    setLoadingActive(true);
    api
      .get(`/conversations/${activeId}`)
      .then((d) => setActive(d.conversation))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoadingActive(false));
    setParams({ c: activeId });
  }, [activeId, setParams, toast]);

  async function send(e) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !activeId) return;
    setDraft('');
    try {
      const { conversation } = await api.post(`/conversations/${activeId}/messages`, { body });
      setActive(conversation);
      setConvos((cs) =>
        [conversation, ...cs.filter((c) => c._id !== conversation._id)].map((c) =>
          c._id === conversation._id ? { ...c, ...conversation } : c
        )
      );
    } catch (err) {
      toast.error(err.message);
    }
  }

  const other = active?.participants?.find((p) => String(p._id) !== String(user.id));

  // On mobile: when a conversation is selected, hide the list; show a back button.
  return (
    <div className="flex h-[calc(100dvh-58px)]">
      {/* Sidebar */}
      <aside
        className={`w-full sm:w-64 shrink-0 bg-cream-100 border-r border-cream-300 overflow-y-auto ${
          active ? 'hidden sm:block' : 'block'
        }`}
      >
        <div className="p-3 border-b border-cream-300 font-pixel text-lg">messages</div>
        {loadingList && <p className="p-4 text-sm text-ink-500">Loading…</p>}
        {!loadingList && convos.length === 0 && (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-sm font-medium">No conversations yet</p>
            <p className="text-xs text-ink-500 mt-1">
              Start one from a listing page.
            </p>
          </div>
        )}
        {convos.map((c) => {
          const otherP = c.participants.find((p) => String(p._id) !== String(user.id));
          const last = c.messages?.[c.messages.length - 1];
          return (
            <button
              key={c._id}
              onClick={() => setActiveId(c._id)}
              className={`w-full text-left px-3 py-2.5 flex items-start gap-2 hover:bg-cream-200 ${
                activeId === c._id ? 'bg-cream-200' : ''
              }`}
            >
              <span className="w-9 h-9 rounded-full bg-sky-200 grid place-items-center shrink-0">
                <PersonIcon />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {otherP?.name || 'Conversation'}
                </div>
                <div className="text-xs text-ink-500 truncate">{c.contextLabel}</div>
                {last && (
                  <div className="text-xs text-ink-500 truncate mt-0.5">{last.body}</div>
                )}
              </div>
            </button>
          );
        })}
      </aside>

      {/* Active conversation */}
      <section className={`flex-1 flex flex-col ${active ? 'flex' : 'hidden sm:flex'}`}>
        {active ? (
          <>
            <header className="p-3 sm:p-4 border-b border-ink-100 flex items-center gap-3">
              <button
                onClick={() => setActiveId(null)}
                className="sm:hidden p-2 rounded-full hover:bg-ink-100"
                aria-label="Back"
              >
                ←
              </button>
              <span className="w-10 h-10 rounded-full bg-sky-200 grid place-items-center">
                <PersonIcon />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{other?.name}</div>
                <div className="text-xs text-ink-500 truncate">{active.contextLabel}</div>
              </div>
              <ReportButton
                targetType="message"
                targetId={active._id}
                triggerLabel="Report"
                triggerClassName="btn-ghost text-xs"
              />
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
              {loadingActive && <p className="text-ink-500">Loading…</p>}
              {active.messages.map((m, i) => {
                const mine = String(m.sender) === String(user.id);
                return (
                  <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] sm:max-w-md px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                        mine ? 'bg-sage-200' : 'bg-ink-100'
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={send} className="p-3 border-t border-ink-100 flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your message here…"
                className="input flex-1 bg-ink-100/40"
              />
              <button className="btn-primary">Send</button>
            </form>
          </>
        ) : (
          <div className="flex-1 grid place-items-center text-ink-500 p-12 text-center">
            Select a conversation to view messages.
          </div>
        )}
      </section>
    </div>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
