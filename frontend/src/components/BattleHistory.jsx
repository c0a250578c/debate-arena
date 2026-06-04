import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { IconArrowLeft, CharacterIcon } from './Icons';
import '../styles/history.css';

// 🗑️アイコン用のコンポーネントを追加
function IconTrash({ size = 16, className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
    );
}

export default function BattleHistory({ onReturn }) {
    const [battles, setBattles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBattle, setSelectedBattle] = useState(null);
    const [battleDetails, setBattleDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    useEffect(() => {
        apiClient.getBattles()
            .then(data => setBattles(data.battles || []))
            .catch(err => console.error('Failed to list battles:', err))
            .finally(() => setLoading(false));
    }, []);

    const handleSelectBattle = async (b) => {
        setSelectedBattle(b);
        setDetailsLoading(true);
        try {
            const data = await apiClient.getBattle(b.id);
            setBattleDetails(data);
        } catch (err) {
            console.error('Failed to load battle detail', err);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleBackToList = () => {
        setSelectedBattle(null);
        setBattleDetails(null);
    };

    const handleDelete = async (e, battleId) => {
        e.stopPropagation(); // カードのクリックイベントを発火させない
        if (!window.confirm('この履歴を削除しますか？')) return;
        
        try {
            await apiClient.deleteBattle(battleId);
            setBattles(battles.filter(b => b.id !== battleId));
            if (selectedBattle?.id === battleId) {
                handleBackToList();
            }
        } catch (err) {
            console.error('Failed to delete battle:', err);
            alert('削除に失敗しました。');
        }
    };

    if (loading) {
        return <div className="history-container">読み込み中...</div>;
    }

    return (
        <div className="history-container">
            <header className="history-header">
                <button className="btn btn-ghost btn-sm" onClick={selectedBattle ? handleBackToList : onReturn}>
                    <IconArrowLeft size={16} /> 戻る
                </button>
                <h2>ディベート履歴</h2>
            </header>

            {!selectedBattle ? (
                <div className="history-list">
                    {battles.length === 0 ? (
                        <div className="history-empty">履歴がありません。</div>
                    ) : (
                        battles.map(b => (
                            <div key={b.id} className="history-card" onClick={() => handleSelectBattle(b)}>
                                <div className="history-card-header">
                                    <span className="history-date">{new Date(b.created_at).toLocaleString()}</span>
                                    <span className={`history-result ${b.result === 'win' ? 'result-win' : b.result === 'lose' ? 'result-lose' : b.result === 'midway' ? 'result-midway' : 'result-draw'}`}>
                                        {b.result === 'win' ? '勝利' : b.result === 'lose' ? '敗北' : b.result === 'midway' ? '途中終了' : '引き分け'}
                                    </span>
                                    <button 
                                        className="btn btn-ghost btn-sm history-delete-btn" 
                                        onClick={(e) => handleDelete(e, b.id)}
                                        style={{ padding: '0 4px', color: '#ff4d4f', marginLeft: 'auto' }}
                                    >
                                        <IconTrash size={16} />
                                    </button>
                                </div>
                                <div className="history-info">
                                    <div className="history-char">
                                        <CharacterIcon characterId={b.character_id} size={24} />
                                    </div>
                                    <div className="history-topic">「{b.topic}」</div>
                                    <div className="history-score">スコア: {b.score ?? '-'}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="history-detail">
                    {detailsLoading ? (
                        <div>詳細を読み込み中...</div>
                    ) : (
                        battleDetails && (
                            <div className="history-turns">
                                {battleDetails.turns.map((t, i) => (
                                    <div key={i} className={`history-msg ${t.role === 'user' ? 'msg-user' : 'msg-ai'}`}>
                                        <div className="msg-role">{t.role === 'user' ? 'あなた' : 'AI'}</div>
                                        <div className="msg-content">{t.content}</div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}