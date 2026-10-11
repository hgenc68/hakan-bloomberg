import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Terminal ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: '#f87171',
          background: '#090d16',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: 8,
          margin: '20px auto',
          maxWidth: 640
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', marginBottom: 8 }}>
            Bu Sayfa Yüklenirken Bir Sorun Oluştu
          </h3>
          <p style={{ fontSize: 11.5, color: '#94a3b8', maxWidth: 480, margin: '0 auto 16px auto', lineHeight: 1.5 }}>
            {this.state.error?.message || 'Bileşen başlatılırken geçici bir hata oluştu.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                padding: '8px 18px',
                background: 'var(--cyan)',
                color: '#040711',
                fontWeight: 800,
                fontSize: 12,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              Yeniden Dene
            </button>
            <button
              type="button"
              onClick={() => {
                this.handleReset();
                if (typeof window !== 'undefined') window.location.reload();
              }}
              style={{
                padding: '8px 18px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#e2e8f0',
                fontWeight: 700,
                fontSize: 12,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              Uygulamayı Yenile
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
