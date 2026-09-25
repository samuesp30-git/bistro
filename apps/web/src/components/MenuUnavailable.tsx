interface MenuUnavailableProps {
  /** What the guest was trying to see, e.g. "menu" or "signature dishes". */
  subject?: string;
}

/**
 * Shown when the menu API cannot be reached.
 *
 * It exists because the API sits on a free tier that sleeps: the honest outcome
 * is telling the guest the kitchen's list is a moment away, not rendering an
 * empty grid that reads as "we serve nothing". The page revalidates on its own,
 * so a reload shortly after usually resolves it.
 */
export default function MenuUnavailable({
  subject = "menu",
}: MenuUnavailableProps) {
  return (
    <div className="border border-ink/10 px-6 py-16 text-center">
      <p className="font-display text-2xl font-semibold text-ink">
        The {subject} is just waking up
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
        We could not load it this second. Give it a moment and refresh — or call
        us and we will read it to you.
      </p>
    </div>
  );
}
