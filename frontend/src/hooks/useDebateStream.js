/**
 * useDebateStream - Custom hook for SSE streaming debate responses
 */
import { useCallback, useRef } from 'react';
import { apiClient } from '../api/client';

export default function useDebateStream() {
  const abortRef = useRef(null);

  const streamResponse = useCallback(async ({ topic, characterId, modeId, difficulty, history, firstStrike = false, onChunk, onError, onDone }) => {
    abortRef.current = new AbortController();
    const TIMEOUT_MS = 20000; // 20秒無反応ならタイムアウト
    let lastActivity = Date.now();

    try {
      const reader = await apiClient.requestDebateStream({
        topic,
        character_id: characterId,
        mode_id: modeId,
        difficulty,
        history,
        first_strike: firstStrike,
      }, abortRef.current.signal);

      const decoder = new TextDecoder();
      let buffer = '';

      const monitorTimeout = setInterval(() => {
        if (Date.now() - lastActivity > TIMEOUT_MS) {
          abortRef.current?.abort();
          clearInterval(monitorTimeout);
        }
      }, 1000);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lastActivity = Date.now();
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'chunk') {
                  onChunk(data.content);
                } else if (data.type === 'error') {
                  onError(data.content);
                } else if (data.type === 'done') {
                  onDone?.();
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
        }
      } finally {
        clearInterval(monitorTimeout);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // タイムアウト監視によって中断された場合はエラーメッセージを出す
        if (Date.now() - lastActivity >= TIMEOUT_MS) {
          onError('通信タイムアウトが発生しました。ネットワーク状態を確認するか、もう一度お試しください。');
        }
        return;
      }

      // 402 → チケット不足
      if (error.status === 402) {
        const detail = error.body?.detail;
        const msg = (typeof detail === 'object' ? detail.message : detail) ||
          'チケットが不足しています。購入ページでチケットを追加してください。';
        onError(msg, { code: 'no_tickets', shopUrl: typeof detail === 'object' ? detail.shop_url : undefined });
        return;
      }

      if (error.status === 401) {
        onError('ログインセッションが切れました。再ログインしてください。', { code: 'unauthorized' });
        return;
      }

      onError(
        '接続エラーが発生しました。バックエンドが起動しているか確認してください。\n\n' +
        'ターミナルで以下を実行:\ncd backend && python main.py'
      );
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { streamResponse, abort };
}
