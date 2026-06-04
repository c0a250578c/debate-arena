import React, { useReducer, useRef, useEffect, useState } from 'react';
import Particles from './Particles';
import JudgeResult from './JudgeResult';
import Toast from './Toast';
import useDebateStream from '../hooks/useDebateStream';
import useJudge from '../hooks/useJudge';
import useThinkingAnimation from '../hooks/useThinkingAnimation';
import { useAuth } from '../hooks/useAuth';
import { TICKET_SHOP_URL } from '../config';
import { apiClient } from '../api/client';
import { CharacterIcon, ModeIcon, IconUser, IconArrowLeft, IconSend, IconScale, IconLoader, IconSword, IconBulb } from './Icons';
import '../styles/battle.css';


function messageReducer(state, action) {
  switch (action.type) {
    case 'ADD_USER':
      return [...state, { role: 'user', content: action.content }];
    case 'ADD_EMPTY_AI':
      return [...state, { role: 'assistant', content: '' }];
    case 'APPEND_AI': {
      const updated = [...state];
      const last = updated[updated.length - 1];
      if (last && last.role === 'assistant') {
        updated[updated.length - 1] = { ...last, content: last.content + action.content };
      }
      return updated;
    }
    case 'SET_LAST_AI': {
      const updated = [...state];
      if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
        updated[updated.length - 1] = { role: 'assistant', content: action.content };
      } else {
        updated.push({ role: 'assistant', content: action.content });
      }
      return updated;
    }
    default:
      return state;
  }
}

/**
 * BattleArena - Full debate battle screen with streaming AI responses.
 * Refactored to use custom hooks and useReducer.
 */
export default function BattleArena({ config, onReturn }) {
  const { character, mode, topic } = config;

  const [messages, dispatch] = useReducer(messageReducer, []);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [input, setInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [round, setRound] = useState(0);
  const [toast, setToast] = useState(null);
  // 観客ヤジ（最新が先頭）
  const [heckles, setHeckles] = useState([]);
  const heckleAbortRef = useRef(null);
  
  // 専属セコンド
  const [coachAdvice, setCoachAdvice] = useState(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);

  const { streamResponse, abort } = useDebateStream();
  const { judgeData, judgeLoading, showJudge, requestJudge, closeJudge, rewardTickets } = useJudge();
  const thinking = useThinkingAnimation(character.thinkingMessages);
  const { user, decrementTicket, refresh } = useAuth();

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // AI先制攻撃のトリガー
  useEffect(() => {
    if (messages.length === 0 && !isAiThinking) {
      triggerFirstStrike();
    }
  }, []);

  const triggerFirstStrike = async () => {
    // チケット確認
    if (user && user.ticket_balance <= 0) {
      setToast('チケットが不足しています。右上の「+ 購入」からチケットを追加してください。');
      return;
    }

    setIsAiThinking(true);
    thinking.start();
    dispatch({ type: 'ADD_EMPTY_AI' });
    thinking.stop();

    let noTicketsShop = null;
    let aiAccumulated = '';

    await streamResponse({
      topic,
      characterId: character.id,
      modeId: mode.id,
      difficulty: config.difficulty || 'normal',
      history: [],
      firstStrike: true,
      onChunk: (content) => {
        aiAccumulated += content;
        dispatch({ type: 'APPEND_AI', content });
      },
      onError: (content, meta) => {
        aiAccumulated = content;
        dispatch({ type: 'SET_LAST_AI', content });
        if (meta?.code === 'no_tickets') {
          noTicketsShop = meta.shopUrl || TICKET_SHOP_URL;
        }
      },
      onDone: () => { },
    });

    if (!noTicketsShop) {
      decrementTicket();
      if (aiAccumulated.trim().length > 0) {
        fetchHeckles('', aiAccumulated.trim(), 0);
      }
    }
    refresh();

    if (noTicketsShop) {
      setToast('チケットが不足しています。右上の「+ 購入」ボタンから追加してください。');
    }

    setIsAiThinking(false);
    thinking.stop();
  };

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abort();
      heckleAbortRef.current?.abort();
    };
  }, [abort]);

  // 観客ヤジを非同期に取得（AI応答とは独立したエンドポイント呼び出し）
  const fetchHeckles = (userMsg, aiMsg, currentRound = round) => {
    heckleAbortRef.current?.abort();
    const controller = new AbortController();
    heckleAbortRef.current = controller;
    apiClient
      .requestHeckles(
        {
          topic,
          character_id: character.id,
          mode_id: mode.id,
          difficulty: config.difficulty || 'normal',
          user_message: userMsg,
          ai_message: aiMsg,
        },
        { signal: controller.signal }
      )
      .then((data) => {
        if (!Array.isArray(data?.heckles) || data.heckles.length === 0) return;
        setHeckles((prev) => {
          const stamped = data.heckles.map((text) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            text,
            round: currentRound,
          }));
          // 最新が先頭、最大30件保持
          return [...stamped, ...prev].slice(0, 30);
        });
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        // ヤジはベストエフォート。UIへのトースト表示はしない。
        // eslint-disable-next-line no-console
        console.warn('Heckle fetch failed', err);
      });
  };

  const handleConsultCoach = async () => {
    if (isAiThinking || isCoachLoading) return;
    
    // AIの最後の発言を取得
    const lastAiMsg = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAiMsg) {
      setToast('まずはバトルを開始してください！');
      return;
    }

    setIsCoachLoading(true);
    setCoachAdvice(null);
    
    try {
      const res = await apiClient.requestCoachAdvice({
        topic,
        character_id: character.id,
        opponent_message: lastAiMsg.content,
        history: messages
      });
      if (res.advice) {
        setCoachAdvice(res.advice);
      }
    } catch (err) {
      console.error('Failed to get coach advice:', err);
      setToast('セコンドとの通信に失敗しました。');
    } finally {
      setIsCoachLoading(false);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isAiThinking) return;

    // 通常のユーザー送信時はもうチケット消費は行わない（先制攻撃または初回リクエストで消費済みのため）


    dispatch({ type: 'ADD_USER', content: trimmed });
    setInput('');
    const targetRound = round + 1;
    setRound(targetRound);
    setIsAiThinking(true);
    thinking.start();

    // 1. 【リアルタイム化】ユーザー送信直後に、ユーザー発言に対するヤジを即時取得
    fetchHeckles(trimmed, '', targetRound);

    const historyForApi = [...messages, { role: 'user', content: trimmed }];

    dispatch({ type: 'ADD_EMPTY_AI' });
    thinking.stop();

    let noTicketsShop = null;
    let aiAccumulated = '';

    await streamResponse({
      topic,
      characterId: character.id,
      modeId: mode.id,
      difficulty: config.difficulty || 'normal',
      history: historyForApi,
      onChunk: (content) => {
        aiAccumulated += content;
        dispatch({ type: 'APPEND_AI', content });
      },
      onError: (content, meta) => {
        aiAccumulated = content;
        dispatch({ type: 'SET_LAST_AI', content });
        if (meta?.code === 'no_tickets') {
          noTicketsShop = meta.shopUrl || TICKET_SHOP_URL;
        }
      },
      onDone: () => { },
    });

    // Refresh balance from server to stay in sync
    refresh();

    if (noTicketsShop) {
      setToast('チケットが不足しています。右上の「+ 購入」ボタンから追加してください。');
    }

    setIsAiThinking(false);
    thinking.stop();
    inputRef.current?.focus();

    // 2. 【リアルタイム化】AI応答が成立した場合のみ、AIの発言に対するヤジを取得
    if (!noTicketsShop && aiAccumulated.trim().length > 0) {
      fetchHeckles('', aiAccumulated.trim(), targetRound);
    }
  };

  const handleJudge = async () => {
    const result = await requestJudge({
      topic,
      characterId: character.id,
      modeId: mode.id,
      difficulty: config.difficulty || 'normal',
      history: messages,
    });
    if (result?.error) {
      setToast(result.error);
    }
  };

  const handleKeyDown = (e) => {
    // Enter / Ctrl+Enter / Cmd+Enter で送信。Shift+Enter は改行。
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !e.nativeEvent?.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReturn = async () => {
    // 途中でディベートが終わった（ジャッジ画面が出ていない）場合で、会話履歴があるなら「途中」として保存
    if (!showJudge && messages.length > 0) {
      try {
        await apiClient.saveBattle({
          character_id: character.id,
          topic,
          difficulty: config.difficulty || 'normal',
          result: 'midway', // 途中終了
          score: null,
          turns: messages.map(m => ({ role: m.role, content: m.content }))
        });
      } catch (err) {
        console.error('Failed to save midway battle:', err);
      }
    }
    onReturn();
  };

  return (
    <div className="battle-arena">
      <div className="arena-bg" />
      <Particles count={15} />

      {/* Header */}
      <header className="battle-arena__header">
        <button
          id="return-to-select"
          className="btn btn-ghost btn-sm"
          onClick={handleReturn}
        >
          <IconArrowLeft size={16} /> <span className="hide-mobile">戻る</span>
        </button>
        <div className="battle-arena__info">
          <span className="battle-arena__mode-badge">
            <ModeIcon modeId={mode.id} size={14} /> {mode.name}
          </span>
          <h2 className="battle-arena__topic">「{topic}」</h2>
        </div>
        <div className="battle-arena__round">
          R{round}
        </div>
      </header>

      {/* VS Bar */}
      <div className="battle-arena__vs-bar">
        <div className="battle-arena__fighter battle-arena__fighter--user">
          <span className="battle-arena__fighter-avatar">
            <IconUser size={20} />
          </span>
          <span className="battle-arena__fighter-name">あなた</span>
        </div>
        <div className="battle-arena__vs-badge">VS</div>
        <div className="battle-arena__fighter battle-arena__fighter--ai">
          <span className="battle-arena__fighter-avatar battle-arena__fighter-avatar--ai">
            <CharacterIcon characterId={character.id} size={20} />
          </span>
          <span className="battle-arena__fighter-name">{character.name}</span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="battle-arena__body">
        <div className="battle-arena__main">
          <div className="battle-arena__chat">
            {messages.length === 0 && (
              <div className="battle-arena__empty">
                <div className="battle-arena__empty-icon">
                  <IconSword size={48} />
                </div>
                <p>お題「{topic}」について、あなたの意見を入力してバトル開始！</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--ai'
                  }`}
              >
                <div className="chat-bubble__avatar">
                  {msg.role === 'user'
                    ? <IconUser size={18} />
                    : <CharacterIcon characterId={character.id} size={18} />
                  }
                </div>
                <div className="chat-bubble__body">
                  <div className="chat-bubble__name">
                    {msg.role === 'user' ? 'あなた' : character.name}
                  </div>
                  <div className="chat-bubble__content">
                    {msg.content}
                    {msg.role === 'assistant' &&
                      i === messages.length - 1 &&
                      isAiThinking && (
                        <span className="streaming-cursor" aria-hidden="true" />
                      )}
                  </div>
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {isAiThinking && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="thinking-indicator">
                <div className="thinking-indicator__dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="thinking-indicator__text">{thinking.thinkingMessage}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Coach Advice Overlay */}
          {coachAdvice && (
            <div className="battle-arena__coach-overlay" onClick={() => setCoachAdvice(null)}>
              <div className="battle-arena__coach-bubble" onClick={e => e.stopPropagation()}>
                <div className="battle-arena__coach-header">
                  <IconBulb size={18} /> 専属セコンドのアドバイス
                  <button className="btn-close" onClick={() => setCoachAdvice(null)}>×</button>
                </div>
                <div className="battle-arena__coach-content">
                  {coachAdvice.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setCoachAdvice(null)} style={{ marginTop: '1rem', width: '100%' }}>
                  了解！
                </button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="battle-arena__input-area">
            <div className="battle-arena__input-wrapper">
              <textarea
                ref={inputRef}
                id="debate-input"
                className="battle-arena__input battle-arena__input--multiline"
                placeholder="立論を入力（Shift+Enterで改行 / Enter または Ctrl+Enterで送信）..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isAiThinking}
                rows={4}
              />
              <button
                id="send-message"
                className="btn btn-primary btn-send"
                onClick={handleSend}
                disabled={!input.trim() || isAiThinking}
                aria-label="送信 (Enter / Ctrl+Enter)"
                title="Enter または Ctrl+Enter で送信"
              >
                <IconSend size={18} />
                <span className="hide-mobile">送信</span>
              </button>
            </div>
            <div className="battle-arena__bottom-actions">
              <span className="battle-arena__hint">Shift+Enterで改行 / Enter または Ctrl+Enter で送信</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  id="consult-coach"
                  className={`btn btn-secondary btn-sm ${isCoachLoading ? 'loading' : ''}`}
                  onClick={handleConsultCoach}
                  disabled={isAiThinking || isCoachLoading || messages.length === 0}
                  title="セコンドに相談（反撃のヒントをもらう）"
                >
                  {isCoachLoading 
                    ? <><IconLoader size={16} className="animate-spin" /> 相談中...</>
                    : <><IconBulb size={16} /> セコンドに相談</>
                  }
                </button>
                <button
                  id="trigger-judge"
                  className="btn btn-ghost btn-sm"
                  onClick={handleJudge}
                  disabled={messages.length < 2 || isAiThinking || judgeLoading}
                >
                  {judgeLoading
                    ? <><IconLoader size={16} /> ジャッジ中...</>
                    : <><IconScale size={16} /> AIジャッジに判定を依頼</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Audience Heckle Column (latest first) */}
        <aside className="audience-column" aria-label="観客のヤジ">
          <div className="audience-column__header">
            <span className="audience-column__title">観客のヤジ</span>
            <span className="audience-column__count">{heckles.length}</span>
          </div>
          <div className="audience-column__list">
            {heckles.length === 0 ? (
              <div className="audience-column__empty">
                発言すると観客が反応します
              </div>
            ) : (
              heckles.map((h) => (
                <div key={h.id} className="audience-bubble">
                  <span className="audience-bubble__round">R{h.round}</span>
                  <span className="audience-bubble__text">{h.text}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* Judge Result Modal */}
      {showJudge && judgeData && (
        <JudgeResult
          data={judgeData}
          modeId={mode.id}
          characterName={character.name}
          characterId={character.id}
          rewardTickets={rewardTickets}
          onClose={closeJudge}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast message={toast} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
