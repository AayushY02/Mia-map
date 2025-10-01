import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { cn } from "../lib/utils";
import { askAI } from "../lib/apiClient";

type ChatPanelProps = {
  meshIds: string[];
  onClose: () => void;
};

type ChatMsg = {
  role: "user" | "ai";
  content: string;
};

export default function ChatPanel({ meshIds, onClose }: ChatPanelProps) {
  const key = useMemo(() => meshIds.slice().sort().join(","), [meshIds]);
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMsg[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<{ message: string }>();

  const messages = chatHistory[key] || [];

  useEffect(() => {
    if (!chatHistory[key]) {
      setChatHistory(prev => ({ ...prev, [key]: [] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const handleSend = async ({ message }: { message: string }) => {
    const q = (message || "").trim();
    if (!q) return;
    setError(null);

    const userMsg: ChatMsg = { role: "user", content: q };
    setChatHistory(prev => ({ ...prev, [key]: [ ...(prev[key] || []), userMsg ] }));
    reset();

    setLoading(true);
    try {
      const r = await askAI({ meshIds, question: q, metricKeys: ["station_count"] });
      const aiMsg: ChatMsg = { role: "ai", content: r.data.answer || "(no answer)" };
      setChatHistory(prev => ({ ...prev, [key]: [ ...(prev[key] || []), aiMsg ] }));
    } catch (e: any) {
      const msg = e?.message || "Failed to get answer.";
      setError(msg);
      setChatHistory(prev => ({ ...prev, [key]: [ ...(prev[key] || []), { role: "ai", content: "Sorry — API error while answering." } ] }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full max-w-[400px] bg-transparent flex flex-col pl-4 py-2 pr-0 space-y-2 z-[99]">
      <div className="p-2 rounded-2xl shadow-2xl bg-white/50 backdrop-blur-2xl border border-black/10 ">
        <div className="px-4 flex justify-between items-center">
          <div className="space-y-1">
            <div className="space-x-2 flex items-center">
              <h2 className="text-lg font-semibold text-gray-800">Mirai AI Chat</h2>
              <span className="bg-blue-200 border border-blue-600 text-blue-600 rounded-full px-2 py-0.5 text-xs">
                {meshIds.length} cell{meshIds.length>1?'s':''}
              </span>
            </div>
            <div className="text-[11px] text-gray-600 line-clamp-2 max-w-[320px]">
              {meshIds.slice(0,3).join(", ")}{meshIds.length>3?' …':''}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-white/50 backdrop-blur-2xl rounded-2xl shadow-2xl border border-black/10">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "p-3 rounded-2xl text-sm max-w-[85%] leading-snug",
              msg.role === "user"
                ? "bg-black text-gray-100 ml-auto"
                : "bg-white text-black mr-auto border border-gray-200"
            )}
          >
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="p-3 rounded-2xl text-sm max-w-[85%] leading-snug bg-white text-black mr-auto border border-gray-200">
            Thinking…
          </div>
        )}
        {error && (
          <div className="p-3 rounded-2xl text-sm max-w-[85%] leading-snug bg-red-50 text-red-700 mr-auto border border-red-200">
            {error}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit(handleSend)}
        className="p-4 border-t bg-white/50 backdrop-blur-2xl rounded-2xl flex gap-2 border border-black/10 shadow-2xl"
      >
        <input
          {...register("message")}
          type="text"
          placeholder="Ask something about these cells…"
          className="flex-1 border border-gray-300 bg-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          disabled={loading}
        />
        <button
          type="submit"
          className="px-5 py-2 text-sm font-medium bg-black text-white rounded-full hover:bg-white hover:text-black cursor-pointer transition"
          disabled={loading}
        >
          Send
        </button>
      </form>
    </div>
  );
}
