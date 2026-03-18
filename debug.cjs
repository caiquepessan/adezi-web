const { exec } = require('child_process');
const fs = require('fs');

exec('npm run build', { cwd: process.cwd() }, (err, stdout, stderr) => {
  if (err && err.message) {
      fs.writeFileSync('error_obj.txt', err.message.replace(/\r/g, ''));
  }
  fs.writeFileSync('stderr_clean.txt', stderr.replace(/\r/g, '\n'));
  console.log("Done checking");
});
