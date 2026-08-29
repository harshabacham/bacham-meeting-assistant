export default {
  locales: ['en', 'es', 'fr', 'hi', 'ja'],
  defaultNamespace: 'common',
  output: 'src/i18n/locales/$LOCALE/$NAMESPACE.json',
  input: ['src/**/*.{ts,tsx}'],
  sort: true,
  createOldCatalogs: false,
  keepRemoved: false, // In production you might want this to true, but for cleanup false is better
  keySeparator: '.', // We use dot notation
  namespaceSeparator: ':',
};
