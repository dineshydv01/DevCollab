import { useState, useEffect, useRef, useCallback } from "react";
import { getSocket } from "../../services/socket.js";
import { api } from "../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import { Send, Users, Circle, Loader2 } from "lucide-react";

export default function ProjectChat({ projectId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load chat history from REST endpoint
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    api
      .get(`/projects/${projectId}/messages?limit=100`)
      .then((res) => {
        if (!isMounted) return;
        setMessages(res.data.data || []);
      })
      .catch((err) => {
        console.error("Failed to load chat history", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
          setTimeout(scrollToBottom, 100);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  // Socket room joining and event handling
  useEffect(() => {
    const socket = getSocket();

    // Join room
    socket.emit("project:join", projectId, (response) => {
      if (response?.success && response?.onlineUsers) {
        setOnlineUsers(response.onlineUsers);
      }
    });

    // Listen for new messages
    const handleNewMessage = (message) => {
      setMessages((prev) => [...prev, message]);
      setTimeout(scrollToBottom, 50);
    };

    // Listen for typing indicators
    const handleTyping = ({ userId, username, isTyping }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) {
          next.add(username);
        } else {
          next.delete(username);
        }
        return next;
      });
    };

    // Listen for presence changes
    const handlePresenceJoin = ({ userId, username }) => {
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.id === userId)) return prev;
        return [...prev, { id: userId, username, fullName: username }];
      });
    };

    const handlePresenceLeave = ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== userId));
    };

    socket.on("chat:message", handleNewMessage);
    socket.on("chat:typing", handleTyping);
    socket.on("chat:presence:join", handlePresenceJoin);
    socket.on("chat:presence:leave", handlePresenceLeave);

    return () => {
      socket.off("chat:message", handleNewMessage);
      socket.off("chat:typing", handleTyping);
      socket.off("chat:presence:join", handlePresenceJoin);
      socket.off("chat:presence:leave", handlePresenceLeave);
    };
  }, [projectId]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    const socket = getSocket();

    // Emit typing indicator
    socket.emit("chat:typing", { projectId, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("chat:typing", { projectId, isTyping: false });
    }, 2000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    const socket = getSocket();

    // Clear typing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("chat:typing", { projectId, isTyping: false });

    socket.emit("chat:send", { projectId, content: trimmed }, (response) => {
      setIsSending(false);
      if (response?.success) {
        setInputText("");
      } else {
        alert(response?.message || "Failed to send message");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 rounded-2xl border border-border bg-white shadow-2xs overflow-hidden h-[620px]">
      {/* Chat Messages Main Panel */}
      <div className="lg:col-span-3 flex flex-col h-full border-r border-border">
        {/* Messages Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3.5 bg-bg-subtle/50">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-bold text-ink">Project Team Channel</h3>
            <span className="font-mono text-xs text-ink-muted">#general</span>
          </div>

          <div className="flex items-center gap-2 lg:hidden text-xs text-ink-muted font-mono">
            <Circle className="h-2 w-2 fill-success text-success" />
            <span>{onlineUsers.length} online</span>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-ink-muted">
              <p className="text-sm font-medium text-ink">No messages in this project yet.</p>
              <p className="text-xs text-ink-muted mt-1">
                Say hello to your teammates or discuss task assignments.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = (m.sender?._id || m.sender) === user?._id;

              return (
                <div
                  key={m._id}
                  className={`flex items-start gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  {m.sender?.profileImage ? (
                    <img
                      src={m.sender.profileImage}
                      alt=""
                      className="h-8 w-8 rounded-full border border-border object-cover shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink font-bold text-xs text-white shrink-0 mt-0.5">
                      {m.sender?.fullName?.charAt(0) || "U"}
                    </div>
                  )}

                  <div className={`max-w-[75%] space-y-1 ${isMe ? "items-end text-right" : ""}`}>
                    <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                      <span className="font-semibold text-ink">{m.sender?.fullName}</span>
                      <span className="font-mono text-[10px]">
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div
                      className={`rounded-2xl px-4 py-2.5 text-xs text-left leading-relaxed ${
                        isMe
                          ? "bg-ink text-white rounded-tr-none"
                          : "bg-bg-subtle text-ink border border-border/80 rounded-tl-none"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="px-6 py-1 font-mono text-[10px] text-ink-muted animate-pulse">
            {Array.from(typingUsers).join(", ")} {typingUsers.size === 1 ? "is" : "are"} typing...
          </div>
        )}

        {/* Message Input Box */}
        <form onSubmit={handleSendMessage} className="border-t border-border p-4 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Send message to team (use @username to mention)..."
              value={inputText}
              onChange={handleInputChange}
              maxLength={2000}
              className="flex-1 rounded-xl border border-border bg-bg-subtle px-4 py-2.5 text-xs text-ink placeholder:text-ink-muted focus:border-ink focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="inline-flex items-center justify-center rounded-xl bg-ink px-4 py-2 text-white hover:bg-ink/90 disabled:opacity-40 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Online Presence Sidebar */}
      <div className="hidden lg:flex flex-col h-full bg-bg-subtle/30 p-4">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-3">
          <Users className="h-4 w-4 text-ink-muted" />
          <span className="font-display text-xs font-bold text-ink uppercase tracking-wider">
            In Chat ({onlineUsers.length})
          </span>
        </div>

        <div className="space-y-2 overflow-y-auto flex-1">
          {onlineUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-2.5 p-1.5 rounded-lg text-xs">
              <div className="relative">
                {u.profileImage ? (
                  <img src={u.profileImage} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-ink text-white font-bold text-[10px] flex items-center justify-center">
                    {u.fullName?.charAt(0) || "U"}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success ring-1 ring-white" />
              </div>
              <span className="truncate text-ink font-medium">{u.fullName}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
