// Simple test runner to verify CLI SVN provider tests
const { execSync } = require('child_process');

try {
  console.log('Running CLI SVN Provider tests...');
  
  // Try to run the test with node directly
  const result = execSync('node --loader ts-node/esm src/scm/__tests__/unit/cli-svn-provider.test.ts', {
    stdio: 'inherit',
    encoding: 'utf8'
  });
  
  console.log('Tests completed successfully');
} catch (error) {
  console.error('Test execution failed:', error.message);
  process.exit(1);
}