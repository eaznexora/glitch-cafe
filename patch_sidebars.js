const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, 'client');
const files = fs.readdirSync(clientDir).filter(f => f.endsWith('.html') && f !== 'users.html' && f !== 'customer.html');

const snippetToInsert = `          <a href="users.html" class="flex items-center px-4 py-3 text-gray-600 hover:bg-monochrome-50 hover:text-monochrome-900 font-medium rounded-lg transition-colors">
            <svg class="h-5 w-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg> Customers / Users
          </a>`;

files.forEach(file => {
  const filePath = path.join(clientDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the inventory link and its closing tag
  const regex = /(<a href="inventory\.html"[\s\S]*?<\/a>)/;
  if (regex.test(content) && !content.includes('href="users.html"')) {
    content = content.replace(regex, `$1\n${snippetToInsert}`);
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
