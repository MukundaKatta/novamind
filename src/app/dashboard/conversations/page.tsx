"use client";

import React, { useEffect, useRef, useState } from "react";
import { useChat } from "@/hooks/use-chat";
import { useSupabase } from "@/hooks/use-supabase";
import { ConversationList } from "@/components/chat/conversation-list";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { ConversationSettings } from "@/components/chat/conversation-settings";
import { ModelSelector } from "@/components/chat/model-selector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Settings2, PanelLeftClose, PanelRightClose, Brain } from "lucide-react";
import { SystemPreset } from "@/types";

export default function ConversationsPage() {
  const supabase = useSupabase();
  const {
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
    updateConversation,
  } = useChat();

  const [showSettings, setShowSettings] = useState(false);
  const [showConvList, setShowConvList] = useState(true);
  const [presets, setPresets] = useState<SystemPreset[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    loadPresets();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, streamingContent]);

  async function loadPresets() {
    const { data } = await supabase
      .from("system_presets")
      .select("*")
      .order("name");
    if (data) setPresets(data);
  }

  return (
    <div className="flex h-full">
      {/* Conversation List Sidebar */}
      {showConvList && (
        <div className="w-80 border-r flex flex-col">
          <ConversationList
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={(id) => setActiveConversation(id)}
            onNew={() => createConversation()}
            onDelete={deleteConversation}
            onPin={async (id) => {
              const conv = conversations.find((c) => c.id === id);
              if (conv) await updateConversation(id, { pinned: !conv.pinned });
            }}
            onArchive={async (id) => {
              await updateConversation(id, { is_archived: true });
            }}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 h-14 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowConvList(!showConvList)}
              className="h-8 w-8"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
            {activeConversation ? (
              <>
                <h2 className="text-sm font-medium truncate max-w-[300px]">
                  {activeConversation.title}
                </h2>
                <ModelSelector
                  value={activeConversation.model}
                  onChange={(model) =>
                    updateConversation(activeConversation.id, { model })
                  }
                />
              </>
            ) : (
              <h2 className="text-sm font-medium text-muted-foreground">
                Select or create a conversation
              </h2>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            className="h-8 w-8"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>

        {activeConversation ? (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="max-w-3xl mx-auto">
                {activeMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onFork={(messageId) =>
                      forkConversation(activeConversation.id, messageId)
                    }
                    onCopy={() => {}}
                  />
                ))}
                {isStreaming && (
                  <MessageBubble
                    message={{
                      id: "streaming",
                      conversation_id: activeConversation.id,
                      role: "assistant",
                      content: streamingContent,
                      model: activeConversation.model,
                      tokens_prompt: 0,
                      tokens_completion: 0,
                      tokens_total: 0,
                      cost: 0,
                      latency_ms: null,
                      finish_reason: null,
                      metadata: {},
                      parent_message_id: null,
                      branch_index: 0,
                      created_at: new Date().toISOString(),
                    }}
                    isStreaming={true}
                    streamingContent={streamingContent}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <ChatInput
              onSend={sendMessage}
              onStop={stopStreaming}
              isStreaming={isStreaming}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-medium">Start a conversation</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Create a new conversation or select an existing one
              </p>
              <Button onClick={() => createConversation()}>
                New Conversation
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && activeConversation && (
        <div className="w-80 border-l overflow-auto">
          <div className="flex items-center justify-between px-4 h-14 border-b">
            <h3 className="text-sm font-medium">Settings</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(false)}
              className="h-8 w-8"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
          <ConversationSettings
            conversation={activeConversation}
            presets={presets}
            onUpdate={(updates) =>
              updateConversation(activeConversation.id, updates)
            }
          />
        </div>
      )}
    </div>
  );
}
