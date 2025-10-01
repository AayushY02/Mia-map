import { cn } from '@/lib/utils';

export function AskAiToolbar(props: {
  active: boolean;
  selectedCount: number;
  onToggle: () => void;
  onClear: () => void;
  onOpenChat: () => void;
  disabled?: boolean;
}) {
  const canChat = props.active && props.selectedCount > 0 && !props.disabled;
  const label = props.active ? 'Exit Ask AI' : 'Ask AI';
  return (
    <>
      <button
        onClick={props.onToggle}
        className={cn(
          'absolute top-3 right-16 z-50 rounded-full px-4 py-2 text-sm font-semibold shadow-xl transition',
          props.active ? 'bg-black text-white hover:bg-white hover:text-black' : 'bg-white text-black hover:bg-black hover:text-white',
          'border border-black/10'
        )}
        aria-pressed={props.active}
      >
        {label}
      </button>

      {/* sticky footer */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-40 px-4 pt-4">
        <div className="pointer-events-auto max-w-[640px] mx-auto">
          <div className={cn(
            'rounded-2xl bg-white/70 backdrop-blur-xl border border-black/10 shadow-2xl px-4 py-3 flex items-center gap-3',
            props.active ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}>
            <span className="text-sm font-medium">
              {props.selectedCount > 0
                ? `Selected ${props.selectedCount} mesh cell${props.selectedCount>1?'s':''}.`
                : 'Click cells to select. Hold SHIFT and drag to box-select.'}
            </span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={props.onClear}
                className="px-3 py-1.5 text-sm rounded-full border border-gray-300 hover:bg-gray-100"
                disabled={props.selectedCount === 0}
              >
                Clear
              </button>
              <button
                onClick={props.onOpenChat}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-full transition',
                  canChat ? 'bg-black text-white hover:bg-white hover:text-black border border-black/10' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                )}
                disabled={!canChat}
              >
                Open Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
