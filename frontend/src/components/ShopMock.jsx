import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { API_BASE } from '../config';
import { IconSword } from './Icons';
import Particles from './Particles';

/**
 * ShopMock - チケット購入をシミュレートする開発用画面.
 * バックエンドの webhook 連携をテストするためのもの.
 */
export default function ShopMock({ onReturn }) {
    const { user, refresh } = useAuth();
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    const plans = [
        { id: 'small', name: 'お試しパック', tickets: 5, price: 500 },
        { id: 'medium', name: 'スタンダード', tickets: 12, price: 1000 },
        { id: 'large', name: 'お得な大容量', tickets: 30, price: 2000 },
    ];

    const handlePurchase = async (plan) => {
        if (!user) return;
        setBusy(true);
        setResult(null);

        try {
            const purchase_id = `mock_p_${Date.now()}`;
            
            const res = await fetch(`${API_BASE}/api/webhook/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Signature': 'mock-dev-signature'
                },
                body: JSON.stringify({
                    user_id: user.id,
                    purchase_id: purchase_id,
                    tickets: plan.tickets,
                    amount_jpy: plan.price
                })
            });

            if (res.ok) {
                setResult({ success: true, message: `${plan.tickets}枚のチケットを追加しました！` });
                // 残高を更新
                if (refresh) refresh();
            } else {
                setResult({ success: false, message: '通信エラーが発生しました。' });
            }
        } catch (e) {
            setResult({ success: false, message: '購入処理に失敗しました。' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="character-select">
            <Particles count={25} />
            <div className="arena-bg" />

            <header className="character-select__header">
                <button 
                    onClick={onReturn} 
                    className="btn btn-ghost btn-sm"
                    style={{ position: 'absolute', top: '2rem', left: '2rem' }}
                >
                    ← 戻る
                </button>
                <h1 className="character-select__title">TICKET SHOP</h1>
                <p className="character-select__subtitle">ディベートに必要なチケットを補充（開発用MOCK）</p>
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                maxWidth: 1000,
                margin: '0 auto',
                padding: '2rem'
            }}>
                {plans.map(plan => (
                    <div key={plan.id} style={{
                        background: 'rgba(20, 20, 32, 0.7)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: 16,
                        padding: '2rem',
                        textAlign: 'center',
                        backdropFilter: 'blur(10px)',
                        transition: 'transform 0.2s',
                        cursor: 'default'
                    }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fff' }}>{plan.name}</h3>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#8b5cf6', margin: '1rem 0' }}>
                            {plan.tickets} <span style={{ fontSize: '1rem' }}>枚</span>
                        </div>
                        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
                            ¥{plan.price.toLocaleString()}
                        </p>
                        <button 
                            className="btn btn-primary" 
                            style={{ width: '100%' }}
                            onClick={() => handlePurchase(plan)}
                            disabled={busy}
                        >
                            {busy ? '処理中...' : '購入する'}
                        </button>
                    </div>
                ))}
            </div>

            {result && (
                <div style={{
                    position: 'fixed',
                    bottom: 40,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '1rem 2rem',
                    borderRadius: 12,
                    background: result.success ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                    color: '#fff',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    animation: 'slideUp 0.3s ease-out'
                }}>
                    {result.message}
                </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '3rem', opacity: 0.6 }}>
                ログイン中のユーザーID: {user?.id}
            </div>
        </div>
    );
}
