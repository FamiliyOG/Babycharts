/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make refactoring and tree shaking difficult.',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-server-in-src',
      severity: 'error',
      comment: 'Frontend production code in src/ must not import backend modules from server/.',
      from: {
        path: '^src/(?!test/)',
      },
      to: {
        path: '^server',
      },
    },
    {
      name: 'no-src-in-server',
      severity: 'error',
      comment: 'Backend code in server/ must not import browser-only frontend code from src/.',
      from: {
        path: '^server',
      },
      to: {
        path: '^src',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    exclude: '(dist|coverage|reports|server/data)',
    tsPreCompilationDeps: false,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      extensions: ['.js', '.jsx', '.json'],
    },
  },
};
