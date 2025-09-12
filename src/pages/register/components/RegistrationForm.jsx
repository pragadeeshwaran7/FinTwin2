import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';

const RegistrationForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (pwd) => pwd?.length >= 8 },
    { label: 'Contains uppercase letter', test: (pwd) => /[A-Z]/?.test(pwd) },
    { label: 'Contains lowercase letter', test: (pwd) => /[a-z]/?.test(pwd) },
    { label: 'Contains number', test: (pwd) => /\d/?.test(pwd) },
    { label: 'Contains special character', test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/?.test(pwd) }
  ];

  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'fullName':
        if (!value?.trim()) {
          newErrors.fullName = 'Full name is required';
        } else if (value?.trim()?.length < 2) {
          newErrors.fullName = 'Full name must be at least 2 characters';
        } else {
          delete newErrors?.fullName;
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value) {
          newErrors.email = 'Email address is required';
        } else if (!emailRegex?.test(value)) {
          newErrors.email = 'Please enter a valid email address';
        } else {
          delete newErrors?.email;
        }
        break;

      case 'password':
        const failedRequirements = passwordRequirements?.filter(req => !req?.test(value));
        if (failedRequirements?.length > 0) {
          newErrors.password = 'Password does not meet requirements';
        } else {
          delete newErrors?.password;
        }
        break;

      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (value !== formData?.password) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else {
          delete newErrors?.confirmPassword;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleInputChange = (e) => {
    const { name, value } = e?.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    // Validate all fields
    Object.keys(formData)?.forEach(key => {
      validateField(key, formData?.[key]);
    });

    // Check agreements
    if (!agreedToTerms || !agreedToPrivacy) {
      setErrors(prev => ({
        ...prev,
        agreements: 'Please accept the terms of service and privacy policy'
      }));
      return;
    }

    // Check if there are any errors
    if (Object.keys(errors)?.length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock registration success
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', formData?.email);
      localStorage.setItem('userName', formData?.fullName);
      
      navigate('/main-dashboard');
    } catch (error) {
      setErrors({ submit: 'Registration failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const passedRequirements = passwordRequirements?.filter(req => req?.test(formData?.password));
    const strength = passedRequirements?.length;
    
    if (strength < 2) return { label: 'Weak', color: 'text-error', bgColor: 'bg-error' };
    if (strength < 4) return { label: 'Fair', color: 'text-warning', bgColor: 'bg-warning' };
    if (strength < 5) return { label: 'Good', color: 'text-accent', bgColor: 'bg-accent' };
    return { label: 'Strong', color: 'text-success', bgColor: 'bg-success' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Create Your Account</h2>
        <p className="text-muted-foreground">
          Join thousands of users managing their finances with AI-powered insights
        </p>
      </div>
      {/* Form Fields */}
      <div className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          name="fullName"
          placeholder="Enter your full name"
          value={formData?.fullName}
          onChange={handleInputChange}
          error={errors?.fullName}
          required
        />

        <Input
          label="Email Address"
          type="email"
          name="email"
          placeholder="Enter your email address"
          value={formData?.email}
          onChange={handleInputChange}
          error={errors?.email}
          description="We'll use this for account verification and important updates"
          required
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Create a strong password"
            value={formData?.password}
            onChange={handleInputChange}
            error={errors?.password}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-muted-foreground hover:text-foreground transition-smooth"
          >
            <Icon name={showPassword ? "EyeOff" : "Eye"} size={16} />
          </button>
        </div>

        {/* Password Strength Indicator */}
        {formData?.password && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Password strength:</span>
              <span className={`text-sm font-medium ${passwordStrength?.color}`}>
                {passwordStrength?.label}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${passwordStrength?.bgColor}`}
                style={{ width: `${(passwordRequirements?.filter(req => req?.test(formData?.password))?.length / passwordRequirements?.length) * 100}%` }}
              />
            </div>
            <div className="grid grid-cols-1 gap-1">
              {passwordRequirements?.map((requirement, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Icon
                    name={requirement?.test(formData?.password) ? "Check" : "X"}
                    size={12}
                    className={requirement?.test(formData?.password) ? "text-success" : "text-muted-foreground"}
                  />
                  <span className={`text-xs ${requirement?.test(formData?.password) ? "text-success" : "text-muted-foreground"}`}>
                    {requirement?.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <Input
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            placeholder="Confirm your password"
            value={formData?.confirmPassword}
            onChange={handleInputChange}
            error={errors?.confirmPassword}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-8 text-muted-foreground hover:text-foreground transition-smooth"
          >
            <Icon name={showConfirmPassword ? "EyeOff" : "Eye"} size={16} />
          </button>
        </div>
      </div>
      {/* Agreements */}
      <div className="space-y-3">
        <Checkbox
          label="I agree to the Terms of Service"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e?.target?.checked)}
          description={
            <span>
              By checking this, you agree to our{' '}
              <Link to="#" className="text-primary hover:text-primary/80 underline">
                Terms of Service
              </Link>
            </span>
          }
        />

        <Checkbox
          label="I agree to the Privacy Policy"
          checked={agreedToPrivacy}
          onChange={(e) => setAgreedToPrivacy(e?.target?.checked)}
          description={
            <span>
              I understand how my data will be processed according to the{' '}
              <Link to="#" className="text-primary hover:text-primary/80 underline">
                Privacy Policy
              </Link>
            </span>
          }
        />

        {errors?.agreements && (
          <p className="text-sm text-error">{errors?.agreements}</p>
        )}
      </div>
      {/* Submit Button */}
      <Button
        type="submit"
        fullWidth
        loading={isLoading}
        disabled={!agreedToTerms || !agreedToPrivacy}
        iconName="UserPlus"
        iconPosition="left"
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>
      {/* Error Message */}
      {errors?.submit && (
        <div className="flex items-center space-x-2 p-3 bg-error/10 border border-error/20 rounded-lg">
          <Icon name="AlertCircle" size={16} className="text-error" />
          <p className="text-sm text-error">{errors?.submit}</p>
        </div>
      )}
      {/* Login Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-primary hover:text-primary/80 font-medium underline"
          >
            Sign in here
          </Link>
        </p>
      </div>
    </form>
  );
};

export default RegistrationForm;