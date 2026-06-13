import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../users/user.model.js';
import generateToken from '../../shared/utils/generateToken.js';
import { OAuth2Client } from 'google-auth-library';
import AppError from '../../shared/errors/AppError.js';
import { sendEmail } from '../../shared/utils/sendEmail.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const register = async (userData) => {
  const { name, email, password, role } = userData;

  if (!password || password.length < 8 || !/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(password)) {
    throw new AppError('Password must be at least 8 characters long and contain both letters and numbers', 400);
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new AppError('User already exists', 400);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
  });

  return user;
};

export const login = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = generateToken(user._id);
  return { user, token };
};

export const googleLogin = async (idToken, role) => {
  if (!idToken) {
    throw new AppError('No Google ID token provided', 400);
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  
  const payload = ticket.getPayload();
  const { email, name, sub: googleId } = payload;

  let user = await User.findOne({ email });

  let isNewUser = false;
  if (user) {
    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
  } else {
    const assignedRole = role === 'employer' ? 'employer' : 'jobseeker';
    user = await User.create({
      name,
      email,
      googleId,
      role: assignedRole,
    });
    isNewUser = true;
  }

  const token = generateToken(user._id);
  return { user, token, isNewUser };
};

export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('There is no user with that email', 404);
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please go to the following link to reset your password: \n\n ${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Lumora Password Reset',
      message,
    });
    return { success: true, message: 'Email sent' };
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError('Email could not be sent', 500);
  }
};

export const resetPassword = async (resetToken, newPassword) => {
  if (!newPassword || newPassword.length < 8 || !/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(newPassword)) {
    throw new AppError('Password must be at least 8 characters long and contain both letters and numbers', 400);
  }

  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError('Invalid or expired token', 400);
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  
  await user.save();

  const token = generateToken(user._id);
  return { user, token };
};
