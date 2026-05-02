import VideoPlayer from "@/components/VideoPlayer";
import ShortcutsModal from "@/components/ShortcutsModal";

export default function Home() {
  return (
    <div className="flex h-screen bg-black text-white relative">
      <VideoPlayer />
      <ShortcutsModal />
    </div>
  );
}
