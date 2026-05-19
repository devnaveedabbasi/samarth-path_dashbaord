// store/slices/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '@/config/axiosInstance';
import { baseUrl, getConfig } from '../slicer';
import { REGISTER, VERIFY_OTP, RESEND_OTP, LOGIN, RESET_PASSWORD, VERIFY_RESET_OTP, FORGOT_PASSWORD, USER_DETAILS, LOGOUT } from '../apiRoutes';
import handleError from '@/helper/handleError';
import { toast } from 'react-hot-toast';
import { AxiosError } from 'axios';

// Define types for API responses
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
}

interface AuthData {
  user: User;
  token: string;
  email?: string;
}

// Register Action
export const register = createAsyncThunk(
  'auth/register',
  async (userData: { name: string; email: string; phone: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<ApiResponse<AuthData>>(baseUrl + REGISTER, userData);
      toast.success(response.data.message || 'Registration successful! Please verify your email.');
      return response.data.data;
    } catch (error) {
      handleError(error);
      if (error instanceof AxiosError) {
        return rejectWithValue(error.response?.data?.message || 'Registration failed');
      }
      return rejectWithValue('An unexpected error occurred');
    }
  }
);

// Verify OTP Action
export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async (data: { email: string; otp: string }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<ApiResponse<AuthData>>(baseUrl + VERIFY_OTP, data);
      toast.success(response.data.message || 'Email verified successfully!');
      return response.data.data;
    } catch (error) {
      handleError(error);
      if (error instanceof AxiosError) {
        return rejectWithValue(error.response?.data?.message || 'OTP verification failed');
      }
      return rejectWithValue('An unexpected error occurred');
    }
  }
);

// Resend OTP Action
export const resendOTP = createAsyncThunk(
  'auth/resendOTP',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<ApiResponse<{ message: string }>>(baseUrl + RESEND_OTP, { email });
      toast.success(response.data.message || 'OTP resent successfully!');
      return response.data.data;
    } catch (error) {
      handleError(error);
      if (error instanceof AxiosError) {
        return rejectWithValue(error.response?.data?.message || 'Failed to resend OTP');
      }
      return rejectWithValue('An unexpected error occurred');
    }
  }
);


// Forgot Password - Request OTP
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<ApiResponse<{ message: string }>>(baseUrl + FORGOT_PASSWORD, { email });
      toast.success(response.data.message || 'OTP sent to your email!');
      return response.data.data;
    } catch (error) {
      handleError(error);
      if (error instanceof AxiosError) {
        return rejectWithValue(error.response?.data?.message || 'Failed to send OTP');
      }
      return rejectWithValue('An unexpected error occurred');
    }
  }
);

// Verify Reset OTP
export const verifyResetOTP = createAsyncThunk(
  'auth/verifyResetOTP',
  async (data: { email: string; otp: string }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<ApiResponse<{ valid: boolean }>>(baseUrl + VERIFY_RESET_OTP, data);
      toast.success(response.data.message || 'OTP verified successfully!');
      return response.data.data;
    } catch (error) {
      handleError(error);
      if (error instanceof AxiosError) {
        return rejectWithValue(error.response?.data?.message || 'OTP verification failed');
      }
      return rejectWithValue('An unexpected error occurred');
    }
  }
);

// Reset Password
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (data: { email: string; newPassword: string; confirmPassword: string }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<ApiResponse<{ message: string }>>(baseUrl + RESET_PASSWORD, data);
      toast.success(response.data.message || 'Password reset successfully!');
      return response.data.data;
    } catch (error) {
      handleError(error);
      if (error instanceof AxiosError) {
        return rejectWithValue(error.response?.data?.message || 'Failed to reset password');
      }
      return rejectWithValue('An unexpected error occurred');
    }
  }
);


// Login Action
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<ApiResponse<AuthData>>(baseUrl + LOGIN, credentials);
      toast.success(response.data.message || 'Login successful!');
      // Store token in localStorage
      if (response.data.data?.token) {
        localStorage.setItem('token', response.data.data.token);
      }
      return response.data.data;
    } catch (error) {
      handleError(error);
      if (error instanceof AxiosError) {
        return rejectWithValue(error.response?.data?.message || 'Login failed');
      }
      return rejectWithValue('An unexpected error occurred');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<ApiResponse<{ message: string }>>(baseUrl + LOGOUT, getConfig());
      toast.success(response.data.message || 'Logged out successfully');
      return response.data.data;
    } catch (error) {
      handleError(error);
      if (error instanceof AxiosError) {
        return rejectWithValue(error.response?.data?.message || 'Logout failed');
      }
      return rejectWithValue('An unexpected error occurred');
    }
  }
);

// Fix userDetails action
export const userDetails = createAsyncThunk(
  'auth/userDetails',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<ApiResponse<any>>(baseUrl + USER_DETAILS, getConfig());
      return response.data.data;
    } catch (error) {
      handleError(error);
      if (error instanceof AxiosError) {
        return rejectWithValue(error.response?.data?.message || 'Failed to fetch user details');
      }
      return rejectWithValue('An unexpected error occurred');
    }
  }
);


interface AuthState {
  loading: boolean;
  error: string | null;
  user: User | null;
  token: string | null;
  tempEmail: string | null;
  userDetails: any | null

}

const initialState: AuthState = {
  loading: false,
  error: null,
  user: null,
  token: null,
  tempEmail: null,
  userDetails: null,


};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setTempEmail: (state, action) => {
      state.tempEmail = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.tempEmail = null;
      localStorage.removeItem('token');
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.tempEmail = action.payload?.email || null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Verify OTP
      .addCase(verifyOTP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload?.user;
        state.token = action.payload?.token;
        if (action.payload?.token) {
          localStorage.setItem('token', action.payload.token);
        }
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Resend OTP
      .addCase(resendOTP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resendOTP.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resendOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload?.user;
        state.token = action.payload?.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Forgot Password
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Verify Reset OTP
      .addCase(verifyResetOTP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyResetOTP.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(verifyResetOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Reset Password
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(userDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(userDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.userDetails = action.payload;
      })
      .addCase(userDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.userDetails = null;
        state.tempEmail = null;
        localStorage.removeItem('token');
      })
      .addCase(logoutUser.rejected, (state) => {
        state.loading = false;
        // Still clear local data even if API fails
        state.user = null;
        state.token = null;
        state.userDetails = null;
        state.tempEmail = null;
        localStorage.removeItem('token');
      });
  },
});

export const { clearError, setTempEmail, logout } = authSlice.actions;
export default authSlice.reducer;