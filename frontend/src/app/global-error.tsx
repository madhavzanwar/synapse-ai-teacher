'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Critical Application Error
          </h2>
          <p className="text-sm text-slate-600 mb-6 font-light">
            {error?.message || 'An unhandled exception occurred.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-full transition-colors"
          >
            Reload Synapse
          </button>
        </div>
      </body>
    </html>
  );
}
