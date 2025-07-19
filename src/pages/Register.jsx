import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CognitoGoogleButton from '../components/CognitoGoogleButton';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });

  const [passwordValidation, setPasswordValidation] = useState({
    hasNumber: false,
    hasSpecialChar: false,
    hasUppercase: false,
    hasLowercase: false,
    minLength: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');

  // Password validation function
  const validatePassword = (password) => {
    const validation = {
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      minLength: password.length >= 8
    };
    setPasswordValidation(validation);
    return Object.values(validation).every(Boolean);
  };

  const { signUp, confirmSignUp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Validate password on change
    if (name === 'password') {
      validatePassword(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!');
      return;
    }

    if (!formData.agreeToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    // Validate password requirements
    if (!validatePassword(formData.password)) {
      setError('Password does not meet all requirements. Please check the password criteria below.');
      return;
    }

    setIsLoading(true);

    try {
      await signUp(formData.email, formData.password, {
        'given_name': formData.firstName,
        'family_name': formData.lastName,
        'name': `${formData.firstName} ${formData.lastName}`
      });

      setSuccess('Registration successful! Please check your email for a confirmation code.');
      setNeedsConfirmation(true);

    } catch (error) {
      console.error('Registration error:', error);
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmation = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await confirmSignUp(formData.email, confirmationCode);
      setSuccess('Email confirmed successfully! You can now sign in.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Confirmation error:', error);
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (error) => {
    switch (error.code) {
      case 'UsernameExistsException':
        return 'An account with this email already exists.';
      case 'InvalidPasswordException':
        return 'Password must be at least 8 characters and contain uppercase, lowercase, numbers, and special characters.';
      case 'InvalidParameterException':
        return 'Please check your input and try again.';
      case 'CodeMismatchException':
        return 'Invalid confirmation code. Please try again.';
      case 'ExpiredCodeException':
        return 'Confirmation code has expired. Please request a new one.';
      default:
        return error.message || 'An error occurred during registration. Please try again.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center items-center space-x-2 mb-6">
            <span className="text-4xl">🐾</span>
            <h1 className="text-3xl font-display font-bold text-gray-900">PetVerse</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join our community!</h2>
          <p className="text-gray-600">Create your account to get started</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-green-400">✅</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          {needsConfirmation ? (
            <form onSubmit={handleConfirmation} className="space-y-6">
              <div>
                <label htmlFor="confirmationCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmation Code
                </label>
                <input
                  id="confirmationCode"
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition-colors disabled:bg-gray-100"
                  placeholder="Enter the code from your email"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-secondary-600 hover:bg-secondary-700 disabled:bg-secondary-400 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="relative mr-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs">🐾</span>
                      </div>
                    </div>
                    <span>Confirming...</span>
                  </div>
                ) : (
                  'Confirm Email'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition-colors"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition-colors"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition-colors disabled:bg-gray-100"
                  placeholder="john@example.com"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-gray-400">📧</span>
                </div>
              </div>
            </div>



            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition-colors disabled:bg-gray-100"
                  placeholder="Create a strong password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-gray-400"></span>
                </div>
              </div>

              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
                  <div className="space-y-1">
                    <div className={`flex items-center text-sm ${passwordValidation.minLength ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-2">{passwordValidation.minLength ? '✓' : '✗'}</span>
                      At least 8 characters long
                    </div>
                    <div className={`flex items-center text-sm ${passwordValidation.hasUppercase ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-2">{passwordValidation.hasUppercase ? '✓' : '✗'}</span>
                      Contains at least 1 uppercase letter
                    </div>
                    <div className={`flex items-center text-sm ${passwordValidation.hasLowercase ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-2">{passwordValidation.hasLowercase ? '✓' : '✗'}</span>
                      Contains at least 1 lowercase letter
                    </div>
                    <div className={`flex items-center text-sm ${passwordValidation.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-2">{passwordValidation.hasNumber ? '✓' : '✗'}</span>
                      Contains at least 1 number
                    </div>
                    <div className={`flex items-center text-sm ${passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-2">{passwordValidation.hasSpecialChar ? '✓' : '✗'}</span>
                      Contains at least 1 special character
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition-colors disabled:bg-gray-100"
                  placeholder="Confirm your password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-gray-400"></span>
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="agreeToTerms"
                name="agreeToTerms"
                type="checkbox"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                className="h-4 w-4 text-secondary-600 focus:ring-secondary-500 border-gray-300 rounded"
              />
              <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-700">
                I agree to the{' '}
                <a href="#" className="text-secondary-600 hover:text-secondary-500 transition-colors">
                  Terms and Conditions
                </a>{' '}
                and{' '}
                <a href="#" className="text-secondary-600 hover:text-secondary-500 transition-colors">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-secondary-600 hover:bg-secondary-700 disabled:bg-secondary-400 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="relative mr-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs">🐾</span>
                    </div>
                  </div>
                  <span>Creating account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
          )}

          {/* Google Sign-In Option */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <CognitoGoogleButton
                text="signup_with"
                onSuccess={(userData) => {
                  console.log('✅ Cognito Google sign-up successful:', userData);
                  // Navigation is handled automatically by the AuthCallback component
                }}
                onError={(error) => {
                  setError('Google sign-up failed. Please try again.');
                  console.error('❌ Cognito Google sign-up error:', error);
                }}
              />
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-secondary-600 hover:text-secondary-500 transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;