
/* 
const path = require('path');         
const { spawn } = require('child_process');

// Backend path
 const backendPath = path.join(__dirname, 'Backend', 'ResHelp');
 const backend = spawn('dotnet', ['run'], {
   cwd: backendPath,
   stdio: 'inherit',
   shell: true
 });

 backend.on('close', (code) => {
   console.log(`Backend exited with code ${code}`);
 });

// Frontend path
const frontendPath = path.join(__dirname, 'Frontend', 'maintenance-system');
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: frontendPath,
  stdio: 'inherit',
  shell: true
});

frontend.on('close', (code) => {
  console.log(`Frontend exited with code ${code}`);
});




*/
const path = require('path');
const { spawn } = require('child_process');

// --- Backend ---
const backendPath = path.join(__dirname, 'Backend', 'ResHelp');
const backend = spawn('dotnet', ['run'], {
  cwd: backendPath,
  stdio: 'inherit',
  shell: true
});

backend.on('close', (code) => {
  console.log(`Backend exited with code ${code}`);
});

// --- Frontend ---
const frontendPath = path.join(__dirname, 'Frontend', 'maintenance-system');

// Step 1: Build first
const build = spawn('npm', ['run', 'build'], {
  cwd: frontendPath,
  stdio: 'inherit',
  shell: true
});

build.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Build completed successfully. Starting frontend...');
    // Step 2: Start frontend after build
    const start = spawn('npm', ['run', 'start'], {
      cwd: frontendPath,
      stdio: 'inherit',
      shell: true
    });

    start.on('close', (code) => {
      console.log(`Frontend exited with code ${code}`);
    });
  } else {
    console.error(`❌ Build failed with code ${code}. Frontend not started.`);
  }
});
