import * as statService from './stat.service.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

export const getSystemStats = asyncHandler(async (req, res) => {
  const stats = await statService.getSystemStats();
  res.status(200).json({
    success: true,
    data: stats,
  });
});
