"use client";

import { useRef } from "react";

type Props = {
    subtitles: any[];
    replaceSubtitles: (data: any[]) => void;
    showToast: (msg: string, type: "success" | "error") => void;
};

export default function ProjectControls({
    subtitles,
    replaceSubtitles,
    showToast
}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Save Project
    const handleSaveProject = () => {
        const data = {
            version: 1,
            subtitles,
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "subtitle-project.json";
        a.click();

        URL.revokeObjectURL(url);

        showToast("Project saved", "success");
    };

    //Load project
    const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".json")) {
            showToast("Invalid file format", "error");
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const parsed = JSON.parse(content);

                if (parsed.version === 1 && Array.isArray(parsed.subtitles)) {
                    replaceSubtitles(parsed.subtitles);
                    showToast("Project loaded successfully", "success");
                } else {
                    showToast("Invalid project file", "error");
                }
            } catch {
                showToast("Failed in loading project", "error");
            }

            e.target.value = "";
        };

        reader.readAsText(file);
    };

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={handleSaveProject}
                className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-md text-sm border border-gray-700 cursor-pointer"
            >
                Save Project
            </button>

            <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-md text-sm border border-gray-700">
                Load Project
                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleLoadProject}
                    className="hidden"
                />
            </label>
        </div>
    )
}