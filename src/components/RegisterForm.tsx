'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import ErrorMessage from './ErrorMessage';
import Link from 'next/link';
import usePageTitle from '@/hooks/usePageTitle';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterForm() {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  usePageTitle("Register");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof RegisterFormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterFormData> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setMessage('');
    setErrors({});

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Registration successful! Please login.');
        setFormData({ email: '', password: '', confirmPassword: '' });
      } else {
        // Handle different types of backend errors
        if (data.details && Array.isArray(data.details)) {
          // Handle validation errors with field-specific messages
          const fieldErrors: Partial<RegisterFormData> = {};
          data.details.forEach((detail: { field: string; message: string }) => {
            if (detail.field === 'email') {
              fieldErrors.email = detail.message;
            } else if (detail.field === 'password') {
              fieldErrors.password = detail.message;
            } else if (detail.field === 'confirmPassword') {
              fieldErrors.confirmPassword = detail.message;
            }
          });
          setErrors(fieldErrors);

          // Show general validation error message
          setMessage(data.error || 'Please check the form for errors.');
        } else {
          // Handle simple error messages
          setMessage(data.error || data.message || 'Registration failed');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboards' });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
          <p className="text-gray-600">Sign up to get started</p>
        </div>

        <ErrorMessage
          message={message}
          type={message.includes('successful') ? 'success' : 'error'}
        />

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.email ? 'border-red-500' : ''
              }`}
            id="email"
            name="email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
          />
          {errors.email && <p className="text-red-500 text-xs italic mt-1">{errors.email}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.password ? 'border-red-500' : ''
              }`}
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
          />
          {errors.password && <p className="text-red-500 text-xs italic mt-1">{errors.password}</p>}
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.confirmPassword ? 'border-red-500' : ''
              }`}
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isLoading}
          />
          {errors.confirmPassword && <p className="text-red-500 text-xs italic mt-1">{errors.confirmPassword}</p>}
        </div>

        <div className="flex items-center justify-between mb-4">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:opacity-50"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </div>

        <div className="text-center mb-4">
          <span className="text-gray-500">or</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-2 px-4 border border-gray-300 rounded shadow flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>
        <div className="text-center mt-4">
          <span className="text-gray-600 text-sm">
            Already have an account ?{' '}
            <button
              type="button"
              className="text-blue-500 hover:text-blue-700 font-medium"
              onClick={() => window.location.href = '/login'}
            >
              Sign in
            </button>
          </span>
        </div>
      </form>
    </div>
  );
}