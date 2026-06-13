import jwt from 'jsonwebtoken';
import User from '../../features/users/user.model.js';

import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id).select('-password');
    
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'The user belonging to this token no longer exists.' });
    }
    
    req.user = currentUser;
    next();
  } catch (error) {
    // Pass JWT errors to centralized error handler for consistent formatting
    next(error);
  }
});

export const employerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'employer') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as an employer' });
  }
};

export const jobseekerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'jobseeker') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as a jobseeker' });
  }
};
