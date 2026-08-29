const fs = require('fs');

const posBlock = fs.readFileSync('pos_data.txt', 'utf8');
let mainCode = fs.readFileSync('client/src/main.js', 'utf8');

const startRegex = /window\.posCart = \[\];[\s\S]*?\/\/ \[\{ id, name, variant, toppings: \[\], basePrice, finalPrice, qty \}\]|window\.posCart = window\.posCart \|\| \[\];/;
const startMatch = mainCode.match(startRegex);
const startIndex = startMatch ? startMatch.index : mainCode.indexOf('window.posCart = ');

const errorStr = "console.error('POS submit error:', err);";
const errorStrIndex = mainCode.indexOf(errorStr);
if (errorStrIndex === -1) {
    console.error("Could not find POS submit error");
    process.exit(1);
}

const endIndex = mainCode.indexOf('};', errorStrIndex) + 2;

if (startIndex !== -1 && endIndex !== -1) {
  mainCode = mainCode.substring(0, startIndex) + posBlock + '\n\n' + mainCode.substring(endIndex);
  
  fs.writeFileSync('client/src/main.js', mainCode);
  console.log("Successfully replaced the block!");
} else {
  console.log("Could not find start or end index.");
  process.exit(1);
}
