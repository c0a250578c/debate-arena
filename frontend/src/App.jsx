import { useState } from 'react';
import CharacterSelect from './components/CharacterSelect';
import BattleArena from './components/BattleArena';
import BattleHistory from './components/BattleHistory';
import ErrorBoundary from './components/ErrorBoundary';
import LoginScreen from './components/LoginScreen';
import UserBadge from './components/UserBadge';
import ShopMock from './components/ShopMock';
import { AuthProvider, useAuth } from './hooks/useAuth';
import './styles/auth.css';
import { useEffect } from 'react';

function AppInner() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState('select');
  const [battleConfig, setBattleConfig] = useState(null);

  useEffect(() => {
    // 簡易ルーティング: URLパスを確認
    if (window.location.pathname === '/shop-mock') {
      setScreen('shop');
    }
  }, []);

  const handleStartBattle = (config) => {
    setBattleConfig(config);
    setScreen('battle');
  };

  const handleReturnToSelect = () => {
    setScreen('select');
    setBattleConfig(null);
    // URLをトップに戻す
    window.history.pushState({}, '', '/');
  };

  const handleViewHistory = () => {
    setScreen('history');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#050508', color: 'rgba(240,240,245,0.6)', fontFamily: "'Noto Sans JP', sans-serif",
      }}>
        Loading...
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 100,
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center'
      }}>
        {screen === 'select' && (
          <button onClick={handleViewHistory} className="btn btn-outline btn-sm">
            ディベート履歴
          </button>
        )}
        <UserBadge />
      </div>

      {screen === 'select' && (
        <CharacterSelect onStartBattle={handleStartBattle} />
      )}
      {screen === 'battle' && battleConfig && (
        <BattleArena
          config={battleConfig}
          onReturn={handleReturnToSelect}
        />
      )}
      {screen === 'history' && (
        <BattleHistory onReturn={handleReturnToSelect} />
      )}
      {screen === 'shop' && (
        <ShopMock onReturn={handleReturnToSelect} />
      )}
    </>
  );
}

/**
 * App - Main application entry point for DEBATE ARENA.
 * Wraps the UI with Auth + Error boundaries.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ErrorBoundary>
  );
}
