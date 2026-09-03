'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.warn('App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2 font-['Inter']">
          Something went wrong
        </h2>
        <p className="text-sm text-slate-600 mb-6 font-light">
          {error?.message || 'An unexpected error occurred in the classroom.'}
        </p>
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-full transition-colors shadow-sm"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
