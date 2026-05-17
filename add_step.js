const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src/components', (filePath) => {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    // regex matches type="number" that is not followed by step= on the same element
    // Actually, simpler: replace `type="number"` with `type="number" step="any"`
    // We will just do a simple replacement and if there's duplicate step="any" we can fix it, but there isn't.
    let newContent = content.replace(/type="number"/g, 'type="number" step="any"');
    // Prevent duplicate step="any" step="any"
    newContent = newContent.replace(/step="any" step="any"/g, 'step="any"');
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log('Updated', filePath);
    }
  }
});
