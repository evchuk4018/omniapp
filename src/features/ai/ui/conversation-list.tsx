"use client";

import type { ConversationSummary } from "@/features/ai/types";

type Props = {
  items: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (item: ConversationSummary) => void;
  onDelete: (item: ConversationSummary) => void;
};

export function ConversationList({ items, activeId, onSelect, onCreate, onRename, onDelete }: Props) {
  return (
    <aside className="surface w-full rounded-xl p-3 md:w-[280px]">
      <button
        className="mb-3 w-full rounded-lg bg-[#1a73e8] px-3 py-2 text-sm font-medium text-white hover:bg-[#2e80ee]"
        onClick={onCreate}
        type="button"
      >
        New Conversation
      </button>
      <div className="space-y-1">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <div
              className={`group flex items-center gap-2 rounded-lg border px-2 py-2 ${
                active ? "border-[#2a3442] bg-[#161d27]" : "border-transparent hover:bg-[#171a1f]"
              }`}
              key={item.id}
            >
              <button
                className="flex-1 text-left text-sm"
                onClick={() => onSelect(item.id)}
                title={item.title}
                type="button"
              >
                <p className="truncate">{item.title}</p>
                <p className="text-xs text-[#97a0ab]">{item.provider}</p>
              </button>
              <button
                className="hidden rounded px-1 text-xs text-[#97a0ab] hover:bg-[#2a2e35] group-hover:inline"
                onClick={() => onRename(item)}
                type="button"
              >
                Rename
              </button>
              <button
                className="hidden rounded px-1 text-xs text-[#97a0ab] hover:bg-[#2a2e35] group-hover:inline"
                onClick={() => onDelete(item)}
                type="button"
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
