/**
 * Build a MongoDB query with search, pagination, and sorting
 * @param {Object} queryParams - Query parameters from request
 * @returns {Object} { query, skip, limit, sort }
 */
export const buildQuery = (queryParams = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    sort = '-createdAt',
    location = '',
    type = '',
    experienceLevel = '',
    minSalary = 0
  } = queryParams;

  // Validate and sanitize pagination
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  // Build secure search query using MongoDB Text Indexes instead of ReDoS-vulnerable RegExp
  let query = { isActive: true };
  
  if (search) {
    query.$text = { $search: search };
  }

  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Exact match and range filters
  if (location) query.location = { $regex: new RegExp(`^${escapeRegExp(location)}$`, 'i') }; 
  if (type) query.type = type;
  if (experienceLevel) query.experienceLevel = experienceLevel;
  if (minSalary > 0) query.numericSalary = { $gte: parseInt(minSalary) };

  // Parse sort parameter
  const sortObj = {};
  if (sort) {
    const field = sort.startsWith('-') ? sort.slice(1) : sort;
    const order = sort.startsWith('-') ? -1 : 1;
    const allowedSortFields = ['createdAt', 'numericSalary', 'title', 'company'];
    if (allowedSortFields.includes(field)) {
      sortObj[field] = order;
    } else {
      sortObj['createdAt'] = -1;
    }
  } else {
    sortObj['createdAt'] = -1;
  }
  
  // If search is used, sort by text score if no explicit sort is given
  if (search && sort === '-createdAt') {
    sortObj.score = { $meta: "textScore" };
  }

  return {
    query,
    skip,
    limit: limitNum,
    sort: sortObj
  };
};

/**
 * Build response object with pagination metadata
 * @param {Array} data - Array of documents
 * @param {number} total - Total count of matching documents
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Response object with data and metadata
 */
export const buildPaginatedResponse = (data, total, page, limit) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
  const totalPages = Math.ceil(total / limitNum);

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};
