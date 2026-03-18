const { exec } = require('child_process');

exec('npm run build', { cwd: process.cwd() }, (err, stdout, stderr) => {
  console.log("--- STDOUT ---");
  console.log(stdout);
  console.log("--- STDERR ---");
  console.log(stderr);
  if (err) {
    console.log("--- ERROR OBJ ---");
    console.log(err.message);
  }
});
