import * as authService from './auth.service.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

// Cookies are no longer used for JWT. Token is sent in response body.

export const registerUser = asyncHandler(async (req, res) => {
  await authService.register(req.body);
  res.status(201).json({
    message: 'Account created successfully. Please login.',
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body.email, req.body.password);
  res.json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token
  });
});

export const logoutUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
});

export const googleLogin = asyncHandler(async (req, res) => {
  const { idToken, role } = req.body;
  const { user, token, isNewUser } = await authService.googleLogin(idToken, role);
  
  res.status(isNewUser ? 201 : 200).json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  if (!req.body.email) {
    return res.status(400).json({ message: 'Please provide an email address' });
  }
  const result = await authService.forgotPassword(req.body.email);
  res.status(200).json(result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  if (!req.body.password) {
    return res.status(400).json({ message: 'Please provide a new password' });
  }
  const { user, token } = await authService.resetPassword(req.params.token, req.body.password);
  res.status(200).json({
    message: 'Password reset successful',
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token
  });
});
