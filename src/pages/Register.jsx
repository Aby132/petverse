import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CognitoGoogleButton from '../components/CognitoGoogleButton';
import userService from '../services/userService';

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
  const [fieldValidation, setFieldValidation] = useState({
    firstName: { isValid: false, message: '', touched: false },
    lastName: { isValid: false, message: '', touched: false },
    email: { isValid: false, message: '', touched: false, checking: false },
    password: { isValid: false, message: '', touched: false },
    confirmPassword: { isValid: false, message: '', touched: false }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');

  // Email validation cache to avoid repeated API calls
  const [emailCache, setEmailCache] = useState(new Map());

  // Clean up cache periodically to prevent memory leaks
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setEmailCache(new Map()); // Clear cache every 5 minutes
    }, 300000); // 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  // Optimized debounced email check with caching
  const debouncedEmailCheck = useCallback(
    debounce(async (email) => {
      if (!email || !email.includes('@')) {
        setFieldValidation(prev => ({
          ...prev,
          email: { ...prev.email, checking: false, isValid: false, message: 'Please enter a valid email address' }
        }));
        return;
      }

      // Check cache first
      if (emailCache.has(email)) {
        const cachedResult = emailCache.get(email);
        setFieldValidation(prev => ({
          ...prev,
          email: {
            ...prev.email,
            checking: false,
            isValid: !cachedResult.exists,
            message: cachedResult.exists ? 'Email already exists' : 'Email is available'
          }
        }));
        return;
      }

      setFieldValidation(prev => ({
        ...prev,
        email: { ...prev.email, checking: true }
      }));

      try {
        const result = await userService.checkEmailExists(email);
        
        // Cache the result for 5 minutes
        setEmailCache(prev => {
          const newCache = new Map(prev);
          newCache.set(email, result);
          return newCache;
        });

        setFieldValidation(prev => ({
          ...prev,
          email: {
            ...prev.email,
            checking: false,
            isValid: !result.exists,
            message: result.exists ? 'Email already exists' : 'Email is available'
          }
        }));
      } catch (error) {
        setFieldValidation(prev => ({
          ...prev,
          email: {
            ...prev.email,
            checking: false,
            isValid: false,
            message: 'Unable to verify email availability'
          }
        }));
      }
    }, 300), // Reduced debounce time from 500ms to 300ms
    [emailCache]
  );

  // Debounce utility function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Pure password strength checker (no state side-effects)
  const isPasswordValid = (password) => {
    return (
      /\d/.test(password) &&
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      password.length >= 8
    );
  };

  // Field validation functions
  const validateFirstName = (firstName) => {
    if (!firstName.trim()) {
      return { isValid: false, message: 'First name is required' };
    }
    if (firstName.trim().length < 2) {
      return { isValid: false, message: 'First name must be at least 2 characters' };
    }
    if (!/^[a-zA-Z\s]+$/.test(firstName.trim())) {
      return { isValid: false, message: 'First name can only contain letters and spaces' };
    }
    return { isValid: true, message: 'First name looks good' };
  };

  const validateLastName = (lastName) => {
    if (!lastName.trim()) {
      return { isValid: false, message: 'Last name is required' };
    }
    if (lastName.trim().length < 2) {
      return { isValid: false, message: 'Last name must be at least 2 characters' };
    }
    if (!/^[a-zA-Z\s]+$/.test(lastName.trim())) {
      return { isValid: false, message: 'Last name can only contain letters and spaces' };
    }
    return { isValid: true, message: 'Last name looks good' };
  };

  const validateEmail = (email) => {
    if (!email.trim()) {
      return { isValid: false, message: 'Email is required' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }
    return { isValid: true, message: 'Email format is valid' };
  };

  const validateConfirmPassword = (confirmPassword, password) => {
    if (!confirmPassword) {
      return { isValid: false, message: 'Please confirm your password' };
    }
    if (confirmPassword !== password) {
      return { isValid: false, message: 'Passwords do not match' };
    }
    return { isValid: true, message: 'Passwords match' };
  };

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
    
    const isValid = Object.values(validation).every(Boolean);
    const message = isValid ? 'Password meets all requirements' : 'Password does not meet all requirements';
    
    setFieldValidation(prev => ({
      ...prev,
      password: { ...prev.password, isValid, message }
    }));
    
    return isValid;
  };

  const { signUp, confirmSignUp } = useAuth();
  const navigate = useNavigate();

  // Helper component for field validation display
  const FieldValidationMessage = ({ field, showIcon = true }) => {
    if (!field.touched || !field.message) return null;
    
    const isError = !field.isValid;
    const isChecking = field.checking;
    
    return (
      <div className={`mt-1 text-sm flex items-center ${isError ? 'text-red-600' : 'text-green-600'}`}>
        {showIcon && (
          <span className="mr-1">
            {isChecking ? '⏳' : isError ? '❌' : '✅'}
          </span>
        )}
        <span>{field.message}</span>
      </div>
    );
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Mark field as touched
    setFieldValidation(prev => ({
      ...prev,
      [name]: { ...prev[name], touched: true }
    }));

    // Real-time validation for each field
    switch (name) {
      case 'firstName':
        const firstNameValidation = validateFirstName(value);
        setFieldValidation(prev => ({
          ...prev,
          firstName: { ...prev.firstName, ...firstNameValidation, touched: true }
        }));
        break;

      case 'lastName':
        const lastNameValidation = validateLastName(value);
        setFieldValidation(prev => ({
          ...prev,
          lastName: { ...prev.lastName, ...lastNameValidation, touched: true }
        }));
        break;

      case 'email':
        const emailValidation = validateEmail(value);
        setFieldValidation(prev => ({
          ...prev,
          email: { ...prev.email, ...emailValidation, touched: true }
        }));
        
        // Debounced email existence check
        if (emailValidation.isValid) {
          debouncedEmailCheck(value);
        }
        break;

      case 'password':
        validatePassword(value);
        // Also validate confirm password if it has a value
        if (formData.confirmPassword) {
          const confirmPasswordValidation = validateConfirmPassword(formData.confirmPassword, value);
          setFieldValidation(prev => ({
            ...prev,
            confirmPassword: { ...prev.confirmPassword, ...confirmPasswordValidation, touched: true }
          }));
        }
        break;

      case 'confirmPassword':
        const confirmPasswordValidation = validateConfirmPassword(value, formData.password);
        setFieldValidation(prev => ({
          ...prev,
          confirmPassword: { ...prev.confirmPassword, ...confirmPasswordValidation, touched: true }
        }));
        break;

      default:
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Recompute validations synchronously from current form data to avoid stale state
    const firstNameValidation = validateFirstName(formData.firstName);
    const lastNameValidation = validateLastName(formData.lastName);
    const emailFormatValidation = validateEmail(formData.email);
    const passwordIsValid = validatePassword(formData.password); // updates state internally as well
    const confirmPasswordValidation = validateConfirmPassword(formData.confirmPassword, formData.password);

    // Update field validation state to reflect latest checks and mark as touched
    setFieldValidation(prev => ({
      ...prev,
      firstName: { ...prev.firstName, ...firstNameValidation, touched: true },
      lastName: { ...prev.lastName, ...lastNameValidation, touched: true },
      email: { ...prev.email, ...emailFormatValidation, touched: true },
      password: { ...prev.password, isValid: passwordIsValid, message: passwordIsValid ? 'Password meets all requirements' : 'Password does not meet all requirements', touched: true },
      confirmPassword: { ...prev.confirmPassword, ...confirmPasswordValidation, touched: true }
    }));

    const allFieldsValid = (
      firstNameValidation.isValid &&
      lastNameValidation.isValid &&
      emailFormatValidation.isValid &&
      passwordIsValid &&
      confirmPasswordValidation.isValid
    );

    if (!allFieldsValid) {
      setError('Please fix all validation errors before submitting.');
      return;
    }

    if (!formData.agreeToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    // Double-check email availability
    if (fieldValidation.email.checking) {
      setError('Please wait for email verification to complete.');
      return;
    }

    if (!fieldValidation.email.isValid) {
      setError('Email is not available or invalid. Please choose a different email.');
      return;
    }

    setIsLoading(true);

    try {
      // Final check: Verify email is still available before registration
      // Use cache if available, otherwise make API call
      let finalEmailCheck;
      if (emailCache.has(formData.email)) {
        finalEmailCheck = emailCache.get(formData.email);
      } else {
        finalEmailCheck = await userService.checkEmailExists(formData.email);
      }
      
      if (finalEmailCheck.exists) {
        setError('Email is no longer available. Please choose a different email address.');
        setIsLoading(false);
        return;
      }

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
        return 'An account with this email already exists. Please use a different email or try signing in.';
      case 'InvalidPasswordException':
        return 'Password must be at least 8 characters and contain uppercase, lowercase, numbers, and special characters.';
      case 'InvalidParameterException':
        return 'Please check your input and try again.';
      case 'CodeMismatchException':
        return 'Invalid confirmation code. Please try again.';
      case 'ExpiredCodeException':
        return 'Confirmation code has expired. Please request a new one.';
      case 'AliasExistsException':
        return 'An account with this email already exists. Please use a different email.';
      case 'InvalidEmailAddressException':
        return 'Please enter a valid email address.';
      default:
        // Check if the error message contains common Cognito error patterns
        if (error.message && error.message.includes('already exists')) {
          return 'An account with this email already exists. Please use a different email or try signing in.';
        }
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition-colors ${
                    fieldValidation.firstName.touched 
                      ? fieldValidation.firstName.isValid 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="John"
                />
                <FieldValidationMessage field={fieldValidation.firstName} />
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition-colors ${
                    fieldValidation.lastName.touched 
                      ? fieldValidation.lastName.isValid 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="Doe"
                />
                <FieldValidationMessage field={fieldValidation.lastName} />
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition-colors disabled:bg-gray-100 ${
                    fieldValidation.email.touched 
                      ? fieldValidation.email.isValid 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="john@example.com"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {fieldValidation.email.checking ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                  ) : (
                    <span className="text-gray-400">📧</span>
                  )}
                </div>
              </div>
              <FieldValidationMessage field={fieldValidation.email} />
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition-colors disabled:bg-gray-100 ${
                    fieldValidation.password.touched 
                      ? fieldValidation.password.isValid 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="Create a strong password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-gray-400">🔒</span>
                </div>
              </div>
              <FieldValidationMessage field={fieldValidation.password} />

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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition-colors disabled:bg-gray-100 ${
                    fieldValidation.confirmPassword.touched 
                      ? fieldValidation.confirmPassword.isValid 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-gray-400">🔒</span>
                </div>
              </div>
              <FieldValidationMessage field={fieldValidation.confirmPassword} />
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
              disabled={(() => {
                if (isLoading) return true;
                if (!formData.agreeToTerms) return true;
                // compute from current values to avoid stale state
                const firstNameOk = validateFirstName(formData.firstName).isValid;
                const lastNameOk = validateLastName(formData.lastName).isValid;
                const emailFormatOk = validateEmail(formData.email).isValid;
                const passwordOk = isPasswordValid(formData.password);
                const confirmOk = validateConfirmPassword(formData.confirmPassword, formData.password).isValid;
                // Allow enabling even if email availability check is pending; server will re-check
                const allOk = firstNameOk && lastNameOk && emailFormatOk && passwordOk && confirmOk;
                return !allOk;
              })()}
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