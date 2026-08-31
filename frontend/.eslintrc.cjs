module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: 'detect' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

    // Off because this codebase documents component contracts in prose next to
    // the component rather than duplicating them as propTypes. Turning it on
    // would demand a second, less accurate copy of the same information.
    'react/prop-types': 'off',

    // The R3F convention. <mesh position={[0,1,0]} rotation-x={Math.PI/2} />
    // uses dash-cased props that React does not recognise, and this rule would
    // flag every one of them.
    'react/no-unknown-property': 'off',

    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    eqeqeq: ['error', 'smart'],
    'prefer-const': 'warn',
  },
  overrides: [
    {
      // Each context file exports a Provider component next to its consumer hook,
      // which is exactly the pattern this rule flags. Splitting them into two
      // files to satisfy the linter would double the file count and separate two
      // things that are only meaningful together. Fast refresh loses provider
      // state on edit here; that is an acceptable cost in four files.
      files: ['src/contexts/*.jsx'],
      rules: { 'react-refresh/only-export-components': 'off' },
    },
  ],
};
