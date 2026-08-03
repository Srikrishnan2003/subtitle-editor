"use client";

import { useRef, useState, useEffect } from "react";
import { useSubtitles, Subtitle } from "@/hooks/useSubtitles";
import { generateSRT } from "@/lib/generateSRT";
import { parseSRT } from "@/lib/parseSRT";
import { transliterate } from "@/lib/transliterate";
import { useToast } from "@/hooks/useToast";
import { useProjectStorage } from "@/hooks/useProjectStorage";

import ProjectControls from "./ProjectControls";

export default function VideoPlayer() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoURL, setVideoURL] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [flash, setFlash] = useState<string | null>(null);
    const [activeSubtitleId, setActiveSubtitleId] = useState<number | null>(null);
    const [tamilMode, setTamilMode] = useState(false);

    const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const prevSubtitlesLength = useRef(0);
    const subtitleRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const { showToast } = useToast();
    const {
        subtitles,
        addSubtitleStart,
        setSubtitleEnd,
        updateSubtitleText,
        updateStartTime,
        updateEndTime,
        deleteSubtitle,
        undo,
        replaceSubtitles,
    } = useSubtitles();

    useProjectStorage(subtitles, replaceSubtitles);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setVideoURL(url);
        }
    };

    const handleImportSRT = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.srt')) {
            showToast("Invalid file format. Please upload an .srt file", "error");
            return;
        }

        if (subtitles.length > 0) {
            const confirmReplace = window.confirm("Importing an SRT file will replace your current subtitles. Continue?");
            if (!confirmReplace) {
                e.target.value = '';
                return;
            }
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const parsed = parseSRT(content);

                if (parsed.length === 0) {
                    showToast("No valid subtitles found in the file", "error");
                } else {
                    replaceSubtitles(parsed);
                    showToast("SRT imported successfully", "success");
                }
            } catch (error) {
                showToast("Failed to parse SRT file", "error");
            }
            e.target.value = '';
        };
        reader.onerror = () => {
            showToast("Failed to read file", "error");
            e.target.value = '';
        };
        reader.readAsText(file, "UTF-8");
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        const ms = Math.floor((time % 1) * 100);

        return `${mins.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
    };

    const showFlash = (message: string) => {
        setFlash(message);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setFlash(null), 800);
    };

    // Derived state for the subtitle overlay
    const activeSubtitle = subtitles.find(
        (s) => s.end !== null && currentTime >= s.start && currentTime <= s.end
    );

    // Store last known text for smooth fade-out animation
    const lastActiveTextRef = useRef<string>("");
    if (activeSubtitle?.text) {
        lastActiveTextRef.current = activeSubtitle.text;
    }
    const showOverlay = activeSubtitle && activeSubtitle.text.trim().length > 0;
    const overlayText = showOverlay ? activeSubtitle.text : lastActiveTextRef.current;

    const handleEnterNext = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;

        video.pause(); // accurate timing
        const time = video.currentTime;

        setSubtitleEnd(time);
        addSubtitleStart(time);
        showFlash("Next Subtitle");

        video.play();
    };

    // 🧠 Get target subtitle (selected > active)
    const getTargetSubtitle = () => {
        if (selectedId !== null) {
            return subtitles.find((s) => s.id === selectedId);
        }

        return subtitles.find(
            (s) =>
                s.end !== null &&
                currentTime >= s.start &&
                currentTime <= s.end
        );
    };

    const seekTo = (time: number) => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        video.currentTime = time;
        video.play();
    }

    const handleExport = () => {
        const srt = generateSRT(subtitles);

        const blob = new Blob([srt], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "subtitles.srt";
        a.click();

        URL.revokeObjectURL(url);
        showToast("Export completed", "success");
    };

    const lastKeyTimeRef = useRef<number>(0);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const video = videoRef.current;
            if (!video) return;

            // ❗ Ignore typing inside inputs
            const activeElement = document.activeElement;
            const isTyping =
                activeElement instanceof HTMLInputElement ||
                activeElement instanceof HTMLTextAreaElement ||
                (activeElement && activeElement.getAttribute("contenteditable") == "true");

            if (isTyping) return;

            // ❗ Ignore key hold
            if (e.repeat) return;

            // ❗ Prevent accidental rapid double-taps
            const now = Date.now();
            if (now - lastKeyTimeRef.current < 150) return;
            lastKeyTimeRef.current = now;

            const key = e.key.toLowerCase();

            // 🔁 Replay (does NOT need pause)
            if (key === "r") {
                const newTime = Math.max(0, video.currentTime - 2);
                video.currentTime = newTime;
                video.play();
                showFlash("Replay -2s");
                return;
            }

            // ⛔ For timing-sensitive actions → pause first
            const captureTime = () => {
                video.pause();
                return video.currentTime;
            };

            const resume = () => video.play();



            // 🔤 S → Start / Split
            if (e.key === "s") {
                const time = captureTime();
                addSubtitleStart(time);
                showFlash("Start Marker");
                resume();
                return;
            }

            // 🔤 E → End
            if (e.key === "e") {
                const time = captureTime();
                setSubtitleEnd(time);
                showFlash("End Marker");
                resume();
                return;
            }

            // ⌨️ [ and ] → Edit timing
            if (e.key === "[" || e.key === "]") {
                const target = getTargetSubtitle();
                if (!target) return;

                const time = captureTime();

                if (key === "[") {
                    updateStartTime(target.id, time);
                    showFlash("Set Start [");
                }

                if (key === "]") {
                    updateEndTime(target.id, time);
                    showFlash("Set End ]");
                }

                resume();
                return;
            }

            if (e.key === "delete") {
                if (!selectedId) return;

                deleteSubtitle(selectedId);
                setSelectedId(null);
                return;
            }

            if (e.key === "backspace") {
                if (!selectedId) return;

                deleteSubtitle(selectedId);
                setSelectedId(null);
                return;
            }

            if (e.ctrlKey && e.key.toLowerCase() === "z") {
                e.preventDefault();
                undo();
                return;
            }
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [
        addSubtitleStart,
        setSubtitleEnd,
        updateStartTime,
        updateEndTime,
        subtitles,
        currentTime,
        selectedId,
    ]);

    useEffect(() => {
        const active = subtitles.find(
            (s) =>
                s.end !== null &&
                currentTime >= s.start &&
                currentTime <= s.end
        );

        if (active?.id !== activeSubtitleId) {
            setActiveSubtitleId(active?.id ?? null);
        }
    }, [currentTime, subtitles, activeSubtitleId]);

    useEffect(() => {
        if (activeSubtitleId) {
            const el = subtitleRefs.current[activeSubtitleId];
            el?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }
    }, [activeSubtitleId]);

    useEffect(() => {
        // Auto-focus new subtitle
        if (subtitles.length > prevSubtitlesLength.current) {
            const lastSub = subtitles[subtitles.length - 1];
            if (lastSub) {
                setTimeout(() => {
                    const el = subtitleRefs.current[lastSub.id];
                    if (el) {
                        const textarea = el.querySelector("textarea");
                        textarea?.focus();
                    }
                }, 50);
            }
        }
        prevSubtitlesLength.current = subtitles.length;
    }, [subtitles]);

    return (
        <div className="flex h-full w-full overflow-hidden bg-gray-950 text-gray-200 font-sans">
            {/* LEFT PANEL: Video Player */}
            <div className="flex flex-col flex-1 border-r border-gray-800 bg-gray-900 shadow-2xl relative z-10">
                {/* Header (Upload, Export) */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950/80">
                    <div className="flex items-center gap-4">
                        <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 active:scale-95 text-sm px-4 py-2 rounded-md font-medium transition-all duration-200 border border-gray-700 shadow-sm">
                            Upload Video
                            <input type="file" accept="video/*" onChange={handleUpload} className="hidden" />
                        </label>
                        <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 active:scale-95 text-sm px-4 py-2 rounded-md font-medium transition-all duration-200 border border-gray-700 shadow-sm text-gray-300">
                            Import SRT
                            <input type="file" accept=".srt" onChange={handleImportSRT} className="hidden" />
                        </label>

                        <ProjectControls
                            subtitles={subtitles}
                            replaceSubtitles={replaceSubtitles}
                            showToast={showToast}
                        />
                    </div>
                    <button
                        onClick={handleExport}
                        className="bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:active:scale-100 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 shadow-sm"
                        disabled={subtitles.length === 0}
                    >
                        Export SRT
                    </button>
                </div>

                {/* Video Area */}
                <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-hidden bg-black/50">
                    <div className="rounded-lg overflow-hidden border border-gray-800 bg-black w-full max-w-5xl shadow-2xl aspect-video relative flex items-center justify-center">
                        {videoURL ? (
                            <>
                                <video
                                    ref={videoRef}
                                    src={videoURL}
                                    controls
                                    className="w-full h-full object-contain"
                                    onTimeUpdate={handleTimeUpdate}
                                />

                                {/* Subtitle Overlay Preview */}
                                <div
                                    className={`absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 pointer-events-none z-40 transition-opacity duration-300 w-full px-8 flex justify-center
                                        ${showOverlay ? 'opacity-100' : 'opacity-0'}
                                    `}
                                >
                                    <div className="bg-black/60 backdrop-blur-sm text-gray-100 px-6 py-2 rounded-xl text-center text-lg md:text-xl font-semibold shadow-lg max-w-2xl break-words tracking-wide">
                                        {overlayText}
                                    </div>
                                </div>

                                {/* Flash Action Feedback */}
                                {flash && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                                        <div className="bg-black/60 text-white px-6 py-3 rounded-xl text-2xl font-medium backdrop-blur-sm animate-toast-in">
                                            {flash}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center justify-center text-gray-500 flex-col gap-3">
                                <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                <span className="font-medium tracking-wide">No video loaded</span>
                            </div>
                        )}
                    </div>

                    {/* Time Display */}
                    <div className="mt-8 flex items-center justify-center gap-6">
                        <div className="text-3xl font-mono tracking-widest font-light text-gray-300 bg-gray-950/80 px-6 py-3 rounded border border-gray-800 shadow-inner">
                            {formatTime(currentTime)}
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Subtitles */}
            <div className="w-[480px] flex flex-col bg-gray-950 relative z-0">
                <div className="p-4 border-b border-gray-800 bg-gray-900/80 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-200 tracking-wide flex items-center gap-3">
                        Subtitles
                        <button 
                            onClick={() => setTamilMode(!tamilMode)}
                            className={`text-xs px-2 py-1 rounded transition-colors border ${tamilMode ? 'bg-blue-900/50 text-blue-300 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}`}
                            title="Toggle Phonetic Tamil Typing (A → அ)"
                        >
                            A → அ
                        </button>
                    </h2>
                    <span className="text-xs text-gray-500 font-mono">{subtitles.length} items</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {subtitles.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm">
                            <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800/50 flex flex-col items-center max-w-[300px] text-center shadow-inner">
                                <svg className="w-10 h-10 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                                <p className="mb-6 text-gray-400 font-medium">No subtitles yet</p>
                                <div className="space-y-4 text-xs">
                                    <p>Press <kbd className="bg-gray-800 px-2 py-1 rounded mx-1 text-gray-300 font-mono shadow-sm">S</kbd> to set start</p>
                                    <p>Press <kbd className="bg-gray-800 px-2 py-1 rounded mx-1 text-gray-300 font-mono shadow-sm">E</kbd> to set end</p>
                                    <p>Press <kbd className="bg-gray-800 px-2 py-1 rounded mx-1 text-gray-300 font-mono shadow-sm">R</kbd> to replay -2s</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        subtitles.map((s) => {
                            const isActive =
                                s.end !== null &&
                                currentTime >= s.start &&
                                currentTime <= s.end;

                            const isSelected = selectedId === s.id;

                            // active: soft blue background, slight scale
                            // selected: border highlight
                            // default: dark gray, subtle border
                            return (
                                <div
                                    key={s.id}
                                    className={`group flex flex-col gap-3 p-3 rounded-lg border transition-all duration-300 ease-out cursor-pointer transform origin-center
                                        ${isActive ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-[1.01] z-10' :
                                            isSelected ? 'bg-gray-900 border-gray-400 shadow-sm scale-100 z-0' : 'bg-gray-900/40 border-gray-800 hover:border-gray-700 hover:bg-gray-800/80 hover:shadow-md scale-100 z-0'
                                        }
                                    `}
                                    onClick={() => setSelectedId(s.id)}
                                    ref={(el) => { subtitleRefs.current[s.id] = el; }}
                                >
                                    {/* Header: Timing & Actions */}
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); seekTo(s.start); }}
                                            className="text-sm font-mono tracking-tight text-gray-400 hover:text-blue-400 transition-colors"
                                        >
                                            {formatTime(s.start)} <span className="text-gray-600 mx-1">→</span> {s.end ? formatTime(s.end) : "..."}
                                        </button>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); videoRef.current && updateStartTime(s.id, videoRef.current.currentTime) }}
                                                className="text-xs font-medium bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-300 px-2 py-1 rounded transition-all duration-200 border border-gray-700 shadow-sm"
                                                title="Set Start to current time ([)"
                                            >
                                                Set S
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); videoRef.current && updateEndTime(s.id, videoRef.current.currentTime) }}
                                                className="text-xs font-medium bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-300 px-2 py-1 rounded transition-all duration-200 border border-gray-700 shadow-sm"
                                                title="Set End to current time (])"
                                            >
                                                Set E
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteSubtitle(s.id);
                                                    if (selectedId === s.id) setSelectedId(null);
                                                }}
                                                className="text-xs bg-red-950/30 hover:bg-red-900/60 active:scale-95 text-red-400 hover:text-red-300 px-2 py-1 rounded transition-all duration-200 ml-1 border border-red-900/30 hover:border-red-500/50 shadow-sm"
                                                title="Delete Subtitle (Delete)"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>

                                    {/* Text Input */}
                                    <textarea
                                        value={s.text}
                                        onChange={(e) => updateSubtitleText(s.id, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={async (e) => {
                                            if (e.key === "Escape" || (!e.shiftKey && e.key === "Enter")) {
                                                e.preventDefault();
                                                e.currentTarget.blur();
                                                if (e.key === "Enter") handleEnterNext();
                                                return;
                                            }

                                            // Transliteration logic
                                            if (e.key === " " && tamilMode) {
                                                const cursorPosition = e.currentTarget.selectionStart;
                                                const textBeforeCursor = s.text.slice(0, cursorPosition);
                                                const textAfterCursor = s.text.slice(cursorPosition);
                                                
                                                const words = textBeforeCursor.split(/\s+/);
                                                const lastWord = words[words.length - 1];

                                                if (lastWord && /^[a-zA-Z]+$/.test(lastWord)) {
                                                    e.preventDefault(); // Pause the space insertion
                                                    const tWord = await transliterate(lastWord);
                                                    
                                                    const newTextBefore = textBeforeCursor.slice(0, -lastWord.length) + tWord + " ";
                                                    const newText = newTextBefore + textAfterCursor;
                                                    
                                                    updateSubtitleText(s.id, newText);
                                                    
                                                    const newCursorPos = newTextBefore.length;
                                                    setTimeout(() => {
                                                        const el = document.activeElement as HTMLTextAreaElement;
                                                        if (el) {
                                                            el.selectionStart = newCursorPos;
                                                            el.selectionEnd = newCursorPos;
                                                        }
                                                    }, 10);
                                                }
                                            }
                                        }}
                                        placeholder="Type subtitle here..."
                                        className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 focus:shadow-[0_0_12px_rgba(59,130,246,0.15)] transition-all duration-300 ease-out resize-none overflow-hidden placeholder-gray-700"
                                        rows={2}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
