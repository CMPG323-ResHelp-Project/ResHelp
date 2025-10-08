const path = require('path');          // <-- add this
const { spawn } = require('child_process');

// Backend path
// const backendPath = path.join(__dirname, 'Backend', 'ResHelp');
// const backend = spawn('dotnet', ['run'], {
//   cwd: backendPath,
//   stdio: 'inherit',
//   shell: true
// });

// backend.on('close', (code) => {
//   console.log(`Backend exited with code ${code}`);
// });

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
