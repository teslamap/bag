import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('MAKU UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const storefront = typeof window === 'undefined'
      || (!window.location.pathname.startsWith('/admin') && !window.location.pathname.startsWith('/manager'));
    return (
      <main className={cn('flex min-h-[100dvh] flex-col items-center justify-center bg-ivory px-6 text-center text-ink', storefront && 'storefront-theme')}>
        <p className="eyebrow mb-4">MAKU · ტექნიკური შეფერხება</p>
        <h1 className="font-display text-5xl font-light tracking-display">გვერდი ვერ ჩაიტვირთა</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/65">
          მოხდა მოულოდნელი შეცდომა. თქვენი კალათა და მონაცემები შენახულია ბრაუზერში.
        </p>
        <div className="mt-8 flex gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            გვერდის განახლება
          </Button>
          <Button onClick={() => { window.location.href = '/'; }}>მთავარი</Button>
        </div>
      </main>
    );
  }
}
