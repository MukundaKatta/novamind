"use client";

import { useCallback, useRef } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useSupabase } from "./use-supabase";
import { Message, Conversation } from "@/types";

export function useChat() {
  const supabase = useSupabase();
  const abortControllerRef = useRef<AbortController | null>(null);
  const {
    activeConversationId,
    conversations,
    messages,
    isStreaming,
    streamingContent,
    setConversations,
    addConversation,
    updateConversation,
    setActiveConversation,
    setMessages,
    addMessage,
    setIsStreaming,
    setStreamingContent,
    appendStreamingContent,
  } = useChatStore();

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );
  const activeMessages = activeConversationId
    ? messages[activeConversationId] || []
    : [];

  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setConversations(data);
  }, [supabase, setConversations]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (data) setMessages(conversationId, data);
    },
    [supabase, setMessages]
  );

  const createConversation = useCallback(
    async (params: Partial<Conversation> = {}) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title: params.title || "New Conversation",
          model: params.model || "gpt-4o",
          system_prompt: params.system_prompt || null,
          temperature: params.temperature ?? 0.7,
          top_p: params.top_p ?? 1.0,
          max_tokens: params.max_tokens ?? 4096,
          stop_sequences: params.stop_sequences || [],
          workspace_id: params.workspace_id || null,
          tags: params.tags || [],
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        addConversation(data);
        setActiveConversation(data.id);
        return data;
      }
    },
    [supabase, addConversation, setActiveConversation]
  );

  const forkConversation = useCallback(
    async (conversationId: string, atMessageId: string) => {
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv) throw new Error("Conversation not found");

      const msgs = messages[conversationId] || [];
      const forkIndex = msgs.findIndex((m) => m.id === atMessageId);
      const forkedMessages = msgs.slice(0, forkIndex + 1);

      const newConv = await createConversation({
        title: `Fork of ${conv.title}`,
        model: conv.model,
        system_prompt: conv.system_prompt,
        temperature: conv.temperature,
        top_p: conv.top_p,
        max_tokens: conv.max_tokens,
        parent_conversation_id: conversationId,
        forked_at_message_id: atMessageId,
      });

      if (newConv) {
        for (const msg of forkedMessages) {
          await supabase.from("messages").insert({
            conversation_id: newConv.id,
            role: msg.role,
            content: msg.content,
            model: msg.model,
            parent_message_id: msg.id,
          });
        }
        await loadMessages(newConv.id);
      }

      return newConv;
    },
    [conversations, messages, supabase, createConversation, loadMessages]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeConversationId || isStreaming) return;

      const conversation = conversations.find(
        (c) => c.id === activeConversationId
      );
      if (!conversation) return;

      // Add user message to DB
      const { data: userMsg } = await supabase
        .from("messages")
        .insert({
          conversation_id: activeConversationId,
          role: "user",
          content,
        })
        .select()
        .single();

      if (userMsg) {
        addMessage(activeConversationId, userMsg);
      }

      // Build message history
      const currentMessages = [
        ...(messages[activeConversationId] || []),
        userMsg,
      ].filter(Boolean) as Message[];

      const apiMessages = [];
      if (conversation.system_prompt) {
        apiMessages.push({
          role: "system" as const,
          content: conversation.system_prompt,
        });
      }
      for (const msg of currentMessages) {
        if (msg.role === "user" || msg.role === "assistant") {
          apiMessages.push({ role: msg.role, content: msg.content });
        }
      }

      // Stream response
      setIsStreaming(true);
      setStreamingContent("");

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: conversation.model,
            messages: apiMessages,
            temperature: conversation.temperature,
            top_p: conversation.top_p,
            max_tokens: conversation.max_tokens,
            stop: conversation.stop_sequences,
            stream: true,
            conversation_id: activeConversationId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No response body");

        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);

            try {
              const data = JSON.parse(jsonStr);

              if (data.type === "content") {
                fullContent += data.content;
                appendStreamingContent(data.content);
              } else if (data.type === "done") {
                // Save assistant message
                const { data: assistantMsg } = await supabase
                  .from("messages")
                  .insert({
                    conversation_id: activeConversationId,
                    role: "assistant",
                    content: data.content || fullContent,
                    model: conversation.model,
                    tokens_prompt: data.usage?.prompt_tokens || 0,
                    tokens_completion: data.usage?.completion_tokens || 0,
                    tokens_total: data.usage?.total_tokens || 0,
                    cost: data.cost || 0,
                    latency_ms: data.latency_ms || 0,
                    finish_reason: "stop",
                  })
                  .select()
                  .single();

                if (assistantMsg) {
                  addMessage(activeConversationId, assistantMsg);
                }

                // Update conversation title if first message
                if (currentMessages.length <= 2) {
                  const title =
                    content.length > 50
                      ? content.substring(0, 50) + "..."
                      : content;
                  await supabase
                    .from("conversations")
                    .update({ title })
                    .eq("id", activeConversationId);
                  updateConversation(activeConversationId, { title });
                }
              } else if (data.type === "error") {
                console.error("Stream error:", data.error);
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Chat error:", error);
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortControllerRef.current = null;
      }
    },
    [
      activeConversationId,
      isStreaming,
      conversations,
      messages,
      supabase,
      addMessage,
      setIsStreaming,
      setStreamingContent,
      appendStreamingContent,
      updateConversation,
    ]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setStreamingContent("");
  }, [setIsStreaming, setStreamingContent]);

  const deleteConversation = useCallback(
    async (id: string) => {
      await supabase.from("conversations").delete().eq("id", id);
      useChatStore.getState().removeConversation(id);
    },
    [supabase]
  );

  return {
    conversations,
    activeConversation,
    activeConversationId,
    activeMessages,
    isStreaming,
    streamingContent,
    loadConversations,
    loadMessages,
    createConversation,
    forkConversation,
    sendMessage,
    stopStreaming,
    deleteConversation,
    setActiveConversation,
    updateConversation: async (id: string, updates: Partial<Conversation>) => {
      await supabase.from("conversations").update(updates).eq("id", id);
      updateConversation(id, updates);
    },
  };
}
