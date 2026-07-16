const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const parsePagination = (query = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(query.limit, 10) || DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

const buildPaginationMeta = (totalCount, page, limit) => {
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 0;

  return {
    page,
    limit,
    total_count: totalCount,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
    from: totalCount === 0 ? 0 : (page - 1) * limit + 1,
    to: Math.min(page * limit, totalCount),
  };
};

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePagination,
  buildPaginationMeta,
};
