import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { SignIn } from '@clerk/clerk-react';
import Particles from './Particles';
import { IconSword } from './Icons';
import '../styles/characters.css';

export default function LoginScreen() {
    const { loginWithGoogleIdToken, isClerkEnabled } = useAuth();
    const [devEmail, setDevEmail] = useState('');
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    const handleDevLogin = async () => {
        if (!devEmail.trim()) return;
        setBusy(true);
        setError(null);
        try {
            await loginWithGoogleIdToken(`dev-${devEmail.trim()}`);
        } catch (e) {
            setError(e.body?.detail || 'ログインに失敗しました');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="character-select">
            <Particles count={25} />
            <div className="arena-bg" />

            <header className="character-select__header">
                <h1 className="character-select__title">DEBATE ARENA</h1>
                <p className="character-select__subtitle">ログインしてバトルを開始</p>
            </header>

            {isClerkEnabled ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    margin: '0 auto',
                    maxWidth: 420,
                }}>
                    <SignIn 
                        appearance={{
                            variables: {
                                colorPrimary: '#8b5cf6',
                                colorBackground: '#0b0b14',
                                colorText: '#f3f4f6',
                                colorTextSecondary: '#9ca3af',
                                colorInputBackground: '#1e1b4b',
                                colorInputText: '#f3f4f6',
                                colorBorder: '#3730a3',
                            },
                            elements: {
                                card: {
                                    background: 'rgba(20,20,32,0.65)',
                                    border: '1px solid rgba(139,92,246,0.3)',
                                    borderRadius: '16px',
                                    backdropFilter: 'blur(10px)',
                                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                                },
                                headerTitle: {
                                    fontFamily: "'Orbitron', sans-serif",
                                    color: '#f3f4f6',
                                },
                                socialButtonsBlockButton: {
                                    background: 'rgba(30, 30, 50, 0.5)',
                                    borderColor: 'rgba(139,92,246,0.3)',
                                    color: '#f3f4f6',
                                    '&:hover': {
                                        background: 'rgba(139,92,246,0.2)',
                                    }
                                },
                                footer: {
                                    '& a': {
                                        color: '#a78bfa',
                                    }
                                }
                            }
                        }}
                    />
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 20,
                    padding: 32,
                    margin: '0 auto',
                    maxWidth: 420,
                    background: 'rgba(20,20,32,0.55)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    borderRadius: 16,
                    backdropFilter: 'blur(10px)',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: '1rem',
                        color: 'rgba(240,240,245,0.9)',
                    }}>
                        <IconSword size={20} /> SIGN IN (DEV MODE)
                    </div>

                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{
                            padding: 10,
                            fontSize: '0.82rem',
                            color: 'rgba(236,72,153,0.9)',
                            background: 'rgba(236,72,153,0.1)',
                            border: '1px solid rgba(236,72,153,0.3)',
                            borderRadius: 8,
                            textAlign: 'center',
                        }}>
                            開発モード (Clerk環境変数 未設定)<br />
                            任意のメールアドレスでログインできます
                        </div>
                        <input
                            type="email"
                            placeholder="dev@example.com"
                            value={devEmail}
                            onChange={(e) => setDevEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleDevLogin()}
                            className="topic-section__input"
                            style={{ width: '100%' }}
                            disabled={busy}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleDevLogin}
                            disabled={busy || !devEmail.trim()}
                            style={{ width: '100%' }}
                        >
                            開発用ログイン
                        </button>
                    </div>

                    {error && (
                        <div style={{
                            padding: 10,
                            width: '100%',
                            fontSize: '0.85rem',
                            color: '#fca5a5',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: 8,
                            textAlign: 'center',
                        }}>
                            {error}
                        </div>
                    )}

                    <p style={{
                        fontSize: '0.78rem',
                        color: 'rgba(240,240,245,0.5)',
                        textAlign: 'center',
                        margin: 0,
                    }}>
                        初回ログインで無料チケット6枚が付与されます
                    </p>
                </div>
            )}
        </div>
    );
}
