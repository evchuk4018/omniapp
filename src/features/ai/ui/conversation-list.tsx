"use client";

import type { ConversationSummary } from "@/features/ai/types";

type Props = {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRename: (conversation: ConversationSummary) => void;
  onDelete: (conversation: ConversationSummary) => void;
};

export function ConversationList({ conversations, activeId, onSelect, onRename, onDelete }: Props) {
  return (
    <div className="mt-3 space-y-1">
      {conversations.map((conversation) => {
        const active = conversation.id === activeId;
        return (
          <div key={conversation.id} className="group flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-[13px] transition ${
                active ? "bg-[#30302e] text-[#f0ede7]" : "text-[#d1ccc3] hover:bg-[#292927]"
              }`}
              title={conversation.title}
            >
              {conversation.title}
            </button>
            <button
              type="button"
              onClick={() => onRename(conversation)}
              className="hidden rounded px-1.5 py-1 text-[11px] text-[#a8a39a] hover:bg-[#30302e] group-hover:block"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => onDelete(conversation)}
              className="hidden rounded px-1.5 py-1 text-[11px] text-[#a8a39a] hover:bg-[#30302e] group-hover:block"
            >
              Del
            </button>
          </div>
        );
      })}
      {!conversations.length ? <p className="px-2 py-2 text-[13px] text-[#78746d]">No recent chats yet.</p> : null}
    </div>
  );
}
