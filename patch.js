const fs = require('fs');

const posBlock = fs.readFileSync('pos_data.txt', 'utf8');
let mainCode = fs.readFileSync('client/src/main.js', 'utf8');

const startIndex = mainCode.indexOf('window.posCart = ');
const endMarker = '// 5. Submit Complete Order';
const endMarkerIndex = mainCode.indexOf(endMarker);

if (startIndex !== -1 && endMarkerIndex !== -1) {
  const endIndex = mainCode.indexOf('};', endMarkerIndex) + 2;
  
  mainCode = mainCode.substring(0, startIndex) + posBlock + mainCode.substring(endIndex);
  
  fs.writeFileSync('client/src/main.js', mainCode);
  console.log("Successfully replaced the block!");
} else {
  console.log("Could not find start or end index.");
  process.exit(1);
}
