import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Terjadi kendala saat menampilkan halaman.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App ErrorBoundary caught error:', error, info);
  }

  handleRecover = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center font-black text-xl">
              !
            </div>
            <h1 className="text-lg font-black text-slate-900">Terjadi Gangguan Tampilan</h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sistem mendeteksi kesalahan sementara saat merender halaman. Data transaksi Anda tetap tersimpan aman.
            </p>
            {this.state.errorMessage && (
              <div className="text-[11px] font-mono bg-slate-100 text-slate-600 p-2.5 rounded-xl break-words text-left max-h-28 overflow-y-auto">
                {this.state.errorMessage}
              </div>
            )}
            <button
              type="button"
              onClick={this.handleRecover}
              className="w-full py-2.5 px-4 brand-gradient text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
            >
              Coba Pulihkan Tampilan
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
