'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-xl text-center">
        <h2 className="text-4xl font-serif text-slate-900 mb-2 font-['Instrument_Serif']">
          404
        </h2>
        <p className="text-base font-medium text-slate-800 mb-1">Page Not Found</p>
        <p className="text-sm text-slate-500 mb-6 font-light">
          The classroom or lesson node you requested does not exist.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-full transition-colors shadow-sm"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
