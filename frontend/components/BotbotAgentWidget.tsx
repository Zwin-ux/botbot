import React, { useState } from "react";

interface BotbotAgentWidgetProps {
  blueprintId: string;
  userId: string;
}

type WidgetMessage = {
  role: "user" | "bot";
  text: string;
};

export const BotbotAgentWidget: React.FC<BotbotAgentWidgetProps> = ({
  blueprintId,
  userId,
}) => {
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) {
      return;
    }
    const userMessage: WidgetMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch(`/api/agents/${blueprintId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "web",
          userId,
          message: userMessage.text,
        }),
      });
      const result = await response.json();
      setMessages((prev) => [...prev, { role: "bot", text: result.text }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text:
            error instanceof Error
              ? `Something went wrong: ${error.message}`
              : "Unexpected error",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ border: "1px solid #ccc", borderRadius: "8px", padding: "1rem" }}>
      <div
        style={{
          height: "240px",
          overflowY: "auto",
          background: "#fafafa",
          padding: "0.5rem",
          marginBottom: "0.5rem",
        }}
      >
        {messages.map((message, index) => (
          <div key={index} style={{ marginBottom: "0.5rem" }}>
            <strong>{message.role === "user" ? "You" : "Bot"}:</strong> {message.text}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Say something"
          style={{ flex: 1 }}
        />
        <button onClick={sendMessage} disabled={isSending}>
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default BotbotAgentWidget;
