export async function transliterate(text: string, langCode: string = "ta-t-i0-und"): Promise<string> {
    if (!text || !text.trim()) return text;
    
    try {
        const response = await fetch(
            `https://inputtools.google.com/request?text=${encodeURIComponent(
                text
            )}&itc=${langCode}&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`
        );
        
        const data = await response.json();
        
        if (data[0] === "SUCCESS" && data[1] && data[1][0] && data[1][0][1] && data[1][0][1][0]) {
            return data[1][0][1][0];
        }
    } catch (error) {
        console.error("Transliteration error:", error);
    }
    
    return text;
}
