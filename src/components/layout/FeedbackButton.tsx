'use client';

import { useState } from 'react';

const FEEDBACK_URL = 'https://wj.qq.com/s2/25493341/db22/';

export function FeedbackButton() {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* QR Code Popup */}
      {showQR && (
        <div className="absolute bottom-14 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-3 border border-gray-200 dark:border-gray-700">
          <img
            src="/feedback-qr.png"
            alt="Feedback QR Code"
            className="w-32 h-32"
          />
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
            微信扫码反馈
          </p>
        </div>
      )}

      {/* Feedback Button */}
      <a
        href={FEEDBACK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-full shadow-lg transition-colors"
        onMouseEnter={() => setShowQR(true)}
        onMouseLeave={() => setShowQR(false)}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-sm font-medium">反馈</span>
      </a>
    </div>
  );
}
