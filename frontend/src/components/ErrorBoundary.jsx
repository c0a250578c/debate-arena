import { Component } from 'react';

/**
 * ErrorBoundary - Catches render errors and shows a fallback UI.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#050508',
          color: '#f0f0f5',
          fontFamily: "'Noto Sans JP', sans-serif",
          padding: '32px',
          textAlign: 'center',
        }}>
          <h1 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '1.5rem',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            SYSTEM ERROR
          </h1>
          <p style={{ color: 'rgba(240,240,245,0.7)', marginBottom: '24px', maxWidth: '400px' }}>
            予期しないエラーが発生しました。ページを再読み込みしてください。
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 32px',
              borderRadius: '9999px',
              border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              color: 'white',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            再読み込み
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
