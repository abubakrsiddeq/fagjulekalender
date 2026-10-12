/** Horizontally scrollable table wrapper that keyboard users can focus and scroll (WCAG 2.1.1). */
export function ScrollTable({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="tbl" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
