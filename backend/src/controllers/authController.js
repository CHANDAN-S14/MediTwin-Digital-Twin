import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import Hospital from '../models/Hospital.js';


// ============================================================
// JWT
// ============================================================

const signToken = (user) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'JWT_SECRET is missing in backend/.env'
    );
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      hospitalId: user.hospitalId
        ? user.hospitalId.toString()
        : null,
    },
    secret,
    {
      expiresIn: '7d',
    }
  );
};


// ============================================================
// REGISTER
// ============================================================

export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'staff',
      hospitalId,
      department,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Name, email and password are required',
        },
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Password must contain at least 8 characters',
        },
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const allowedRoles = [
      'admin',
      'operator',
      'staff',
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid account role',
        },
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message:
            'An account with this email already exists',
        },
      });
    }

    let resolvedHospitalId = hospitalId;

    if (!resolvedHospitalId) {
      const hospital = await Hospital
        .findOne()
        .sort({ createdAt: 1 });

      if (hospital) {
        resolvedHospitalId = hospital._id;
      }
    }
    const hashedPassword = await bcrypt.hash(password, 12);

const user = new User({
  name: String(name).trim(),
  email: normalizedEmail,
  passwordHash: hashedPassword,
  role,
  hospitalId: resolvedHospitalId,
  department: department
    ? String(department).trim()
    : undefined,
});

    await user.save();

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: user.toSafeJSON(),
      },
    });

  } catch (error) {
    console.error(
      'REGISTER ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      error: {
        message:
          error.message ||
          'Registration failed',
      },
    });
  }
};


// ============================================================
// LOGIN
// ============================================================

export const login = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Email and password are required',
        },
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const user = await User
      .findOne({
        email:   normalizedEmail,
      })
      .select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message:
            'Invalid email or password',
        },
      });
    }

    const validPassword = await bcrypt.compare(
  password,
  user.passwordHash
);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: {
          message:
            'Invalid email or password',
        },
      });
    }

    const token = signToken(user);

    return res.json({
      success: true,
      data: {
        token,
        user: user.toSafeJSON(),
      },
    });

  } catch (error) {
    console.error(
      'LOGIN ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      error: {
        message:
          error.message ||
          'Login failed',
      },
    });
  }
};


// ============================================================
// CURRENT USER
// ============================================================

export const me = async (req, res) => {
  try {
    const userId =
      req.user?.id ||
      req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message:
            'Authentication required',
        },
      });
    }

    const user = await User.findById(
      userId
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message:
            'User account not found',
        },
      });
    }

    return res.json({
      success: true,
      data: {
        user: user.toSafeJSON(),
      },
    });

  } catch (error) {
    console.error(
      'ME ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      error: {
        message:
          error.message ||
          'Unable to get current user',
      },
    });
  }
};


// ============================================================
// UPDATE PROFILE
// ============================================================

export const updateProfile = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.id ||
      req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message:
            'Authentication required',
        },
      });
    }

    const {
      name,
      department,
    } = req.body;

    const user = await User.findById(
      userId
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message:
            'User account not found',
        },
      });
    }

    if (name !== undefined) {
      user.name =
        String(name).trim();
    }

    if (department !== undefined) {
      user.department =
        String(department).trim();
    }

    await user.save();

    return res.json({
      success: true,
      data: {
        user: user.toSafeJSON(),
      },
    });

  } catch (error) {
    console.error(
      'UPDATE PROFILE ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      error: {
        message:
          error.message ||
          'Unable to update profile',
      },
    });
  }
};