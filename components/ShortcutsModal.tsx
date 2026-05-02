"use client";

import { useState, useEffect } from "react";

export default function ShortcutsModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    const sections = [
        {
            title: "Subtitle Creation",
            items: [
                { key: "S", desc: "Start / Split subtitle" },
                { key: "Enter", desc: "Next subtitle" },
            ]
        },
        {
            title: "Playback",
            items: [
                { key: "R", desc: "Replay last 2 seconds" },
            ]
        },
        {
            title: "Editing",
            items: [
                { key: "[", desc: "Set start time" },
                { key: "]", desc: "Set end time" },
            ]
        },
        {
            title: "Management",
            items: [
                { key: "Delete", desc: "Remove selected subtitle" },
                { key: "Ctrl + Z", desc: "Undo" },
            ]
        }
    ];

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 left-6 z-40 bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-300 p-2.5 rounded-full shadow-lg transition-all duration-200 border border-gray-700 flex items-center justify-center group"
                aria-label="Keyboard Shortcuts"
                title="Keyboard Shortcuts"
            >
                <svg className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                >
                    {/* Modal Content */}
                    <div 
                        className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden scale-100"
                        style={{ animation: 'modal-pop 0.2s ease-out forwards' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-gray-950/50">
                            <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2 tracking-wide">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Keyboard Shortcuts
                            </h2>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="text-gray-500 hover:text-gray-300 hover:bg-gray-800 active:scale-95 p-1 rounded-md transition-all duration-200"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            {sections.map((section) => (
                                <div key={section.title}>
                                    <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4">{section.title}</h3>
                                    <div className="space-y-4">
                                        {section.items.map((item) => (
                                            <div key={item.key} className="flex items-center justify-between group">
                                                <span className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">{item.desc}</span>
                                                <kbd className="bg-gray-800 text-gray-200 font-mono text-xs px-2.5 py-1.5 rounded-md border border-gray-700 shadow-sm min-w-[32px] text-center tracking-wider">
                                                    {item.key}
                                                </kbd>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
