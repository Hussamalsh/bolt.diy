import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { AuthButton } from '~/components/auth/AuthButton.client';
import { CHAT_HISTORY_MENU_PANEL_ID, toggleChatHistoryMenu } from '~/components/sidebar/menu-events';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames('flex items-center px-4 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary">
        <button
          type="button"
          onClick={toggleChatHistoryMenu}
          aria-controls={CHAT_HISTORY_MENU_PANEL_ID}
          aria-label="Toggle chat history menu"
          title="Toggle menu"
          className="flex items-center justify-center rounded-md p-1 -ml-1 text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bolt-elements-borderColor"
        >
          <span className="i-ph:sidebar-simple-duotone text-xl" aria-hidden="true" />
        </button>
        <a href="/" className="text-2xl font-semibold text-accent flex items-center">
          Adara
        </a>
      </div>
      {chat.started && ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="">
                <HeaderActionButtons chatStarted={chat.started} />
              </div>
            )}
          </ClientOnly>
        </>
      )}
      {!chat.started && <div className="flex-1" />}
      <ClientOnly>
        {() => (
          <div className="ml-auto pl-4">
            <AuthButton />
          </div>
        )}
      </ClientOnly>
    </header>
  );
}
