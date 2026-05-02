import { useEffect } from "react";

export function useProjectStorage(
    subtitles: any[],
    replaceSubtitles: (data: any[]) => void
) {
    const STORAGE_KEY = "subtitle-editor-data";

    //auto-save
    useEffect(() => {
        const data = {
            version: 1,
            subtitles,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, [subtitles]);

    //Load on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        try {
            const parsed = JSON.parse(saved);
            //check version for backward compatibility

            if (parsed.version === 1 && Array.isArray(parsed.subtitles)) {
                replaceSubtitles(parsed.subtitles);
            }
        } catch (e) {
            console.error("Failed to load saved project");
        }
    }, []);
}