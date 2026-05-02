import { Subtitle } from "@/hooks/useSubtitles";

// 00:01:02,345
function formatSRTTime(seconds: number) {
    const totalMs = Math.floor(seconds * 1000);

    const hrs = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;

    const pad = (n: number, l = 2) => n.toString().padStart(l, "0");

    return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

export const generateSRT = (subtitles: Subtitle[]) => {
    // keep only valid, finished subtitles
    const valid = subtitles
        .filter((s) => s.end !== null && s.end > s.start)
        .sort((a, b) => a.start - b.start);

    return valid
        .map((s, i) => {
            return `${i + 1}
${formatSRTTime(s.start)} --> ${formatSRTTime(s.end!)}
${s.text || ""}`
        })
        .join("\n\n");
}