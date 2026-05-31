# UI Design v2 - AI Foundation

## 1. Design Direction
- Product surface: single-user local AI workspace at `/ai`.
- Visual language: dark editorial utility, high contrast, minimal ornament.
- Layout intent: three-column command layer.
  - Left: conversation rail.
  - Center: chat stream and prompt composer.
  - Model controls are composer-first (dropdown + popup), not a persistent right panel.

## 2. Token Lock (No Alternatives)
- Background: `#050607`
- Surface: `#0d0f12`
- Surface-strong: `#13161a`
- Border: `#1d2228`
- Text: `#f5f7fa`
- Text-muted: `#97a0ab`
- Accent: `#1a73e8`
- Success: `#10a37f`
- Error: `#b94a48`

## 3. Typography and Shape
- Font stack: `Geist`, `Segoe UI`, sans-serif.
- Heading style: semibold, tight tracking.
- Body style: regular with clear line-height.
- Corner system:
  - Panels/cards: `12px`
  - Inputs/buttons: `8px`
  - Composer/send group: full pill

## 4. Route-Level Layout
- `/`: app shell entry with one primary CTA to `/ai`.
- `/ai`: responsive three-column grid.
  - Desktop: `280px / fluid`.
  - Mobile/tablet: vertical stack with conversation list first, chat second.

## 5. Component Contracts

### 5.1 Conversation Rail
- Required actions:
  - Create conversation.
  - Select conversation.
  - Rename conversation.
  - Delete conversation with confirmation.
- Each row shows title and provider.
- Active row uses accent-tinted selection background.

### 5.2 Chat Workspace
- Message roles: user and assistant.
- User message bubble aligns right with accent fill.
- Assistant bubble aligns left with neutral surface.
- Prompt composer at bottom with multiline input and send button.
- Streaming state shows send button text as `Streaming...`.

### 5.3 Model Control
- Composer dropdown for installed models.
- `Search models` action opens popup dialog.
- Popup includes provider selector (Ollama or OpenAI-compatible local).
- Popup includes discoverable model search and download for not-installed Ollama models.
- Popup includes explicit persist-default action.

## 6. UX Rules (Inferred)
- If no installed model exists and user tries to send, block and show: `Download a model first, then send your prompt.`
- Conversation model selection overrides global default.
- Global default applies to new conversations and fallback resolution.
- Download failures must render readable inline status text.

## 7. Accessibility + Interaction
- Keyboard reachable controls for all actions.
- Focus-visible ring on interactive elements.
- Hover never used as the only affordance.
- Status messaging shown in plain text, not color alone.
- Minimum AA contrast target for text and controls.

## 8. Out of Scope Guardrails
- No account/user profile block.
- No team or role UI.
- No external auth UI.
- No unrelated modules in navigation (calendar/tasks/notes).

## 9. Acceptance Mapping
- `/` route works as home shell.
- `/ai` route provides chat feature.
- User can create/manage conversations.
- User can select/search/download/switch models from composer dropdown + popup.
- User can chat with selected local runtime model.
- History persists locally via SQLite.
