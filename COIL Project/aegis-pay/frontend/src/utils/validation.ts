import { Colors } from '@/constants/theme';

export const validateEmail = (email: string): string | null => {
  if (!email?.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return 'Enter a valid email address';
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone?.trim()) return 'Phone number is required';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return 'Enter a valid phone number';
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Must contain at least one number';
  return null;
};

export const validateConfirmPassword = (pw: string, confirm: string): string | null => {
  if (!confirm) return 'Please confirm your password';
  if (pw !== confirm) return 'Passwords do not match';
  return null;
};

export const validateName = (name: string, label: string = 'Name'): string | null => {
  if (!name?.trim()) return `${label} is required`;
  if (name.trim().length < 2) return `${label} must be at least 2 characters`;
  if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(name.trim())) return `${label} can only contain letters`;
  return null;
};

export type LoginForm = { email: string; password: string };
export type RegisterForm = {
  firstName: string; lastName: string; phone: string; email: string;
  password: string; confirmPassword: string;
};
export type FormErrors<T> = Partial<Record<keyof T, string>>;

export const validateLoginForm = (f: LoginForm): FormErrors<LoginForm> => {
  const e: FormErrors<LoginForm> = {};
  const email = validateEmail(f.email);      if (email)    e.email    = email;
  const pw    = !f.password ? 'Password is required' : null;
  if (pw) e.password = pw;
  return e;
};

export const validateRegisterForm = (f: RegisterForm): FormErrors<RegisterForm> => {
  const e: FormErrors<RegisterForm> = {};
  const first   = validateName(f.firstName, 'First name');    if (first)   e.firstName       = first;
  const last    = validateName(f.lastName, 'Last name');      if (last)    e.lastName        = last;
  const phone   = validatePhone(f.phone);                     if (phone)   e.phone           = phone;
  const email   = validateEmail(f.email);                     if (email)   e.email           = email;
  const pw      = validatePassword(f.password);               if (pw)      e.password        = pw;
  const confirm = validateConfirmPassword(f.password, f.confirmPassword);
  if (confirm) e.confirmPassword = confirm;
  return e;
};

export const getPasswordStrength = (pw: string): { level: 0|1|2|3; label: string; color: string } => {
  if (!pw) return { level: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pw.length >= 8)          score++;
  if (pw.length >= 12)         score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Weak',   color: Colors.error };
  if (score <= 3) return { level: 2, label: 'Fair',   color: Colors.warning };
  return            { level: 3, label: 'Strong', color: Colors.primary };
};
