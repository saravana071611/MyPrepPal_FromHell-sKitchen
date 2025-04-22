const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('==========================================');
console.log('  Running UserProfilePage Component Tests');
console.log('==========================================');

// Check if node_modules exists in client directory
const nodeModulesPath = path.join(__dirname, 'client', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('\n⚠️ client/node_modules not found - installing dependencies first...');
  const installProcess = spawn('npm', ['install'], {
    cwd: path.join(__dirname, 'client'),
    stdio: 'inherit',
    shell: true
  });
  
  installProcess.on('exit', (code) => {
    if (code === 0) {
      console.log('✅ Dependencies installed successfully!');
      runTests();
    } else {
      console.error(`❌ Failed to install dependencies. Exit code: ${code}`);
      process.exit(1);
    }
  });
} else {
  runTests();
}

function runTests() {
  console.log('\n🧪 Starting tests...');
  
  // Set environment variables to ensure Jest runs correctly
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    CI: 'true' // This prevents browser from opening
  };
  
  // Run the tests with the --watchAll=false flag to run once
  const testProcess = spawn('npx', ['react-scripts', 'test', '--watchAll=false', '--testMatch', '**/UserProfilePage.test.js'], {
    cwd: path.join(__dirname, 'client'),
    stdio: 'inherit',
    shell: true,
    env
  });

  testProcess.on('error', (error) => {
    console.error('Failed to run tests:', error.message);
    process.exit(1);
  });

  testProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ All tests completed successfully!');
    } else {
      console.log(`\n❌ Tests failed with exit code ${code}`);
      
      // Show suggestions for common errors
      console.log('\n🔍 Troubleshooting suggestions:');
      console.log('1. Check if Jest is properly configured in client/package.json');
      console.log('2. Ensure all dependencies are installed (try "npm install" in the client directory)');
      console.log('3. Look for syntax errors in the test or component files');
      console.log('4. Try running with "npm test -- --no-watch" from the client directory directly');
    }
  });
} 