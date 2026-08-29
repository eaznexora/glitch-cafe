const fs = require('fs');

const posBlock = fs.readFileSync('pos_data.txt', 'utf8');
let mainCode = fs.readFileSync('client/src/main.js', 'utf8');

// I need to read the ORIGINAL main.js before my botched patch!
// Oh wait, did my patch botch it? Yes, it replaced the code. I should restore from git.
