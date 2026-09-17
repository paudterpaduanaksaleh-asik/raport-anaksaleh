const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
let html = fs.readFileSync(path.join(baseDir, 'template.html'), 'utf8');

const partials = ['Styles', 'AdminView', 'KepsekView', 'TeacherView', 'ParentView', 'Scripts'];

partials.forEach(p => {
  const filePath = path.join(baseDir, `${p}.html`);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp('<\\?\\!=\\s*include\\([\'"]' + p + '[\'"]\\);?\\s*\\?>', 'g');
    html = html.replace(regex, content);
  }
});

fs.writeFileSync(path.join(baseDir, 'index.html'), html, 'utf8');
console.log('Build completed! index.html size:', html.length);
