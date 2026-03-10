/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 72],
    'refs-required': [2, 'always'],
  },
  plugins: [
    {
      rules: {
        /**
         * Custom rule: Require "Refs: #<number>" in the commit footer.
         *
         * Valid formats:
         *   Refs: #123
         *   Refs: #123, #456
         */
        'refs-required': ({ raw }) => {
          const refsPattern = /^Refs:\s+#\d+/m;
          const hasRefs = refsPattern.test(raw);

          return [
            hasRefs,
            'Commit message must include a GitHub issue reference in the footer.\n' +
              'Expected format: "Refs: #<number>" (e.g., "Refs: #123" or "Refs: #123, #456")',
          ];
        },
      },
    },
  ],
};
