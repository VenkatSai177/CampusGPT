import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';
import { RegisterDTO, LoginDTO, AuthResponse, UserResponse, JWTPayload } from '../types';
import { AppError } from '../utils/appError';
import { env } from '../config/env';

export const AuthService = {
  formatUserResponse(user: { id: string; name: string; email: string; role: 'student' | 'admin'; created_at: string }): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    };
  },

  generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
  },

  async register(data: RegisterDTO): Promise<AuthResponse> {
    const { name, email, password, role = 'student' } = data;

    // 1. Validation
    if (!name || !email || !password) {
      throw new AppError('Please provide name, email, and password.', 400);
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters long.', 400);
    }

    if (!['student', 'admin'].includes(role)) {
      throw new AppError("Invalid role. Role must be either 'student' or 'admin'.", 400);
    }

    // 2. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Please provide a valid email address.', 400);
    }

    // 3. Check duplicate user
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw new AppError('An account with this email address already exists.', 409);
    }

    // 4. Hash password with bcrypt (salt factor 12)
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // 5. Create user
    const newUser = await UserModel.create({
      name,
      email,
      password_hash,
      role,
    });

    // 6. Generate token
    const token = this.generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return {
      success: true,
      message: 'Registration successful.',
      token,
      user: this.formatUserResponse(newUser),
    };
  },

  async login(data: LoginDTO): Promise<AuthResponse> {
    const { email, password } = data;

    if (!email || !password) {
      throw new AppError('Please provide email and password.', 400);
    }

    // 1. Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    // 2. Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    // 3. Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      success: true,
      message: 'Login successful.',
      token,
      user: this.formatUserResponse(user),
    };
  },

  async getMe(userId: string): Promise<UserResponse> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User profile not found.', 404);
    }
    return this.formatUserResponse(user);
  },
};
