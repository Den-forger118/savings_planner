function Pagination({
  pagination,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 25, 50],
}) {
  if (!pagination || pagination.total_count === 0) {
    return null;
  }

  const { page, limit, total_count, total_pages, has_prev, has_next, from, to } = pagination;

  return (
    <div className="flex flex-col gap-3 border-t border-cream px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-sans text-xs text-taupe">
        Showing {from}–{to} of {total_count}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-sans text-xs text-taupe">
          Rows per page
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number.parseInt(e.target.value, 10))}
            className="rounded border border-cream bg-white px-2 py-1 text-sm text-primary-dark focus:border-gold focus:outline-none"
          >
            {limitOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={!has_prev}
            className="rounded border border-cream px-3 py-1.5 font-sans text-xs font-semibold text-primary-dark transition-colors hover:bg-cream/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹ Prev
          </button>
          <span className="font-sans text-xs text-taupe">
            Page {page} of {total_pages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={!has_next}
            className="rounded border border-cream px-3 py-1.5 font-sans text-xs font-semibold text-primary-dark transition-colors hover:bg-cream/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next ›
          </button>
        </div>
      </div>
    </div>
  );
}

export default Pagination;
