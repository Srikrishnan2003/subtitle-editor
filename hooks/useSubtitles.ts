import { useState } from "react";
import { useToast } from "./useToast";

export type Subtitle = {
    id: number;
    start: number;
    end: number | null;
    text: string;
}

export const useSubtitles = () => {
    const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
    const [history, setHistory] = useState<Subtitle[][]>([]);
    const { showToast } = useToast();

    const addSubtitleStart = (time: number) => {
        const last = subtitles[subtitles.length - 1];
        if (last && last.end == null) {
            if (time <= last.start) {
                console.warn("Invalid end time: earlier than start");
                showToast("Invalid end time: earlier than start", "error");
                return;
            }
        }

        setSubtitles((prev) => {
            pushToHistory(prev);

            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.end == null) {
                last.end = time;
            }

            //Start new subtitle
            updated.push({
                id: Date.now(),
                start: time,
                end: null,
                text: ""
            })

            return updated;
        })
    }

    const setSubtitleEnd = (time: number) => {
        const last = subtitles[subtitles.length - 1];
        if (last && last.end == null) {
            if (time <= last.start) {
                console.warn("Invalid end time: earlier than start");
                showToast("Invalid end time: earlier than start", "error");
                return;
            }
        }

        setSubtitles((prev) => {
            pushToHistory(prev);

            const updated = [...prev];
            const last = updated[updated.length - 1];

            if (last && last.end == null) {
                last.end = time;
            }

            return updated;
        })
    }

    const updateSubtitleText = (id: number, text: string) => {
        setSubtitles((prev) => {
            pushToHistory(prev);

            return prev.map((s) =>
                s.id === id ? { ...s, text } : s
            )
        })
    }

    const updateStartTime = (id: number, time: number) => {
        const index = subtitles.findIndex((s) => s.id === id);
        if (index === -1) return;

        const current = subtitles[index];
        const prevSub = subtitles[index - 1];

        // ❗ prevent invalid with own end
        if (current.end !== null && time >= current.end) {
            showToast("Cannot set start time after end time", "error");
            return;
        }

        // ❗ prevent overlap with previous subtitle
        if (prevSub && prevSub.end !== null && time < prevSub.end) {
            showToast("Cannot overlap previous subtitle", "error");
            return;
        }

        setSubtitles((prev) => {
            pushToHistory(prev);

            return prev.map((s) =>
                s.id === id ? { ...s, start: time } : s
            );
        })
    };

    const updateEndTime = (id: number, time: number) => {
        const index = subtitles.findIndex((s) => s.id === id);
        if (index === -1) return;

        const current = subtitles[index];
        const nextSub = subtitles[index + 1];

        // ❗ prevent invalid with own start
        if (time <= current.start) {
            showToast("Cannot set end time before start time", "error");
            return;
        }

        // ❗ prevent overlap with next subtitle
        if (nextSub && time > nextSub.start) {
            showToast("Cannot overlap next subtitle", "error");
            return;
        }

        setSubtitles((prev) => {
            pushToHistory(prev);

            return prev.map((s) =>
                s.id === id ? { ...s, end: time } : s
            );
        })
    };

    const deleteSubtitle = (id: number) => {
        setSubtitles((prev) => {
            pushToHistory(prev);
            return prev.filter((s) => s.id !== id)
        });
        showToast("Subtitle deleted", "info");
    }

    const pushToHistory = (current: Subtitle[]) => {
        setHistory((prev) => [...prev.slice(-50), current]);
    }

    const undo = () => {
        if (history.length === 0) return;

        setHistory((prev) => {
            const last = prev[prev.length - 1];
            setSubtitles(last);
            return prev.slice(0, -1);
        });
        showToast("Undo successful", "info");
    }

    const replaceSubtitles = (newSubtitles: Subtitle[]) => {
        setSubtitles((prev) => {
            pushToHistory(prev);
            return newSubtitles;
        });
    };

    return {
        subtitles,
        addSubtitleStart,
        setSubtitleEnd,
        updateSubtitleText,
        updateStartTime,
        updateEndTime,
        deleteSubtitle,
        undo,
        replaceSubtitles,
    };
}