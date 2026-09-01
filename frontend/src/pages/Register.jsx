import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://meditwin-digital-twin.onrender.com";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff',
    department: '',
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 8) {
      setError(
        'Password must contain at least 8 characters.'
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/register`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
            department: form.department,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
          result?.message ||
          'Registration failed'
        );
      }

      const { token, user } = result.data;

      localStorage.setItem(
        'meditwin_token',
        token
      );

      localStorage.setItem(
        'meditwin_user',
        JSON.stringify(user)
      );

      setSuccess(
        'Account created successfully!'
      );

      setTimeout(() => {
        navigate('/');
      }, 500);

    } catch (err) {
      console.error(
        'Registration error:',
        err
      );

      setError(
        err.message ||
        'Unable to create account.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-8">

      <div className="w-full max-w-lg">

        {/* Brand */}
        <div className="text-center mb-8">

          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">

            <UserPlus size={27} />

          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Create your MediTwin account
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Join the MediTwin healthcare waste
            management platform
          </p>

        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* Name */}
            <div>

              <label className="text-sm font-medium text-slate-700">
                Full name
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />

            </div>

            {/* Email */}
            <div>

              <label className="text-sm font-medium text-slate-700">
                Email address
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />

            </div>

            {/* Role */}
            <div>

              <label className="text-sm font-medium text-slate-700">
                Account role
              </label>

              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500"
              >

                <option value="staff">
                  Clinical Staff
                </option>

                <option value="operator">
                  Operator
                </option>

                <option value="admin">
                  Administrator
                </option>

              </select>

            </div>

            {/* Department */}
            <div>

              <label className="text-sm font-medium text-slate-700">
                Department
              </label>

              <input
                type="text"
                name="department"
                value={form.department}
                onChange={handleChange}
                placeholder="e.g. ICU, Emergency, Facilities"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500"
              />

            </div>

            {/* Password */}
            <div>

              <label className="text-sm font-medium text-slate-700">
                Password
              </label>

              <div className="relative mt-2">

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none focus:border-teal-500"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>

            </div>

            {/* Confirm password */}
            <div>

              <label className="text-sm font-medium text-slate-700">
                Confirm password
              </label>

              <div className="relative mt-2">

                <input
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none focus:border-teal-500"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>

            </div>

            {/* Security information */}
            <div className="flex gap-3 rounded-xl bg-slate-50 p-4">

              <ShieldCheck
                size={20}
                className="mt-0.5 shrink-0 text-teal-600"
              />

              <p className="text-xs leading-5 text-slate-500">
                Your password is securely hashed
                before it is stored. Never share your
                MediTwin password with others.
              </p>

            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-teal-600 py-3.5 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'Creating account...'
                : 'Create account'}
            </button>

          </form>

          {/* Login */}
          <div className="mt-6 text-center text-sm text-slate-500">

            Already have an account?{' '}

            <Link
              to="/login"
              className="font-semibold text-teal-600 hover:text-teal-700"
            >
              Sign in
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Register;
