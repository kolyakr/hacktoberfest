import type { Toast } from './useLive'

export function Toasts({ toasts, onOpen, onDismiss }: { toasts: Toast[]; onOpen: (id: string) => void; onDismiss: (id: number) => void }) {
  return (
    <div className="toasts" aria-live="assertive">
      {toasts.map(({ id, handoff: h }) => (
        <div key={id} className="toast glass" role="status">
          <span className="pulse" aria-hidden="true" />
          <div className="toast-body">
            <b>{h.name} needs a person</b>
            <span>{h.reason || 'Yurko passed this chat to the team.'}</span>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => { onOpen(h.ticketId); onDismiss(id) }}>Open chat</button>
          <button type="button" className="toast-x" aria-label="Dismiss" onClick={() => onDismiss(id)}>✕</button>
          <span className="toast-timer" aria-hidden="true" />
        </div>
      ))}
    </div>
  )
}
