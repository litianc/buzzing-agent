'use client';

import { useState } from 'react';

const FEEDBACK_URL = 'https://wj.qq.com/s2/25493341/db22/';

export function FeedbackButton() {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* QR Code Popup */}
      {showQR && (
        <div className="absolute bottom-14 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-3 border border-gray-200 dark:border-gray-700 w-[152px]">
          <img
            src="/feedback-qr.png"
            alt="Feedback QR Code"
            width={128}
            height={128}
            className="block"
          />
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
            微信扫码推荐
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
        <span className="text-base leading-none">💡</span>
        <span className="text-sm font-medium">推荐信息源</span>
      </a>
    </div>
  );
}
