import { Subtitle } from "@/hooks/useSubtitles";

export function parseSRTTime(timeString: string): number {
    // format: 00:00:01,200 or 00:00:01.200
    const [hms, ms] = timeString.split(/[,.]/);
    if (!hms || ms === undefined) throw new Error("Invalid time format");

    const parts = hms.split(":");
    if (parts.length !== 3) throw new Error("Invalid time format");

    const [hours, minutes, seconds] = parts;
    
    return (
        parseInt(hours, 10) * 3600 +
        parseInt(minutes, 10) * 60 +
        parseInt(seconds, 10) +
        parseInt(ms.padEnd(3, '0').slice(0, 3), 10) / 1000 // Handle ms length safely
    );
}

export function parseSRT(srtContent: string): Subtitle[] {
    const subtitles: Subtitle[] = [];
    
    // Normalize line endings to \n
    const normalizedContent = srtContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    
    // Split by blank lines
    const blocks = normalizedContent.split(/\n\s*\n/);

    for (const block of blocks) {
        const lines = block.trim().split("\n");
        if (lines.length < 2) continue;

        // The first line might be an index, but we can detect the time line by looking for "-->"
        let timeLineIndex = 0;
        if (!lines[0].includes("-->") && lines.length > 1 && lines[1].includes("-->")) {
            timeLineIndex = 1;
        }

        const timeLine = lines[timeLineIndex];
        if (!timeLine || !timeLine.includes("-->")) continue;

        const [startStr, endStr] = timeLine.split("-->").map(s => s.trim());
        if (!startStr || !endStr) continue;

        let start = 0;
        let end = 0;
        try {
            start = parseSRTTime(startStr);
            end = parseSRTTime(endStr);
        } catch (e) {
            continue; // Skip invalid time formats
        }

        if (start >= end) continue; // Skip invalid duration

        // The rest of the lines are text
        const textLines = lines.slice(timeLineIndex + 1);
        const text = textLines.join("\n").trim();
        
        if (!text) continue;

        subtitles.push({
            id: 0, // placeholder
            start,
            end,
            text,
        });
    }

    // Sort by start time
    subtitles.sort((a, b) => a.start - b.start);

    // Assign unique IDs based on timestamp + index to avoid React key collisions
    const baseId = Date.now();
    return subtitles.map((s, index) => ({
        ...s,
        id: baseId + index,
    }));
}
