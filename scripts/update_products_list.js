// Node script: scan products/ *.html and regenerate the <ul id="productList"> in products.html
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const productsDir = path.join(repoRoot, 'products');
const productsHtmlPath = path.join(repoRoot, 'products.html');

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function readableNameFromFilename(fname) {
  // remove .html and common prefixes, convert hyphens to spaces, trim
  return fname.replace(/\.html$/i, '').replace(/^product-/, '').replace(/-/g, ' ').trim();
}

function getFiles() {
  return fs.readdirSync(productsDir)
    .filter(f => f.endsWith('.html') && f !== 'products_product-template.html')
    .map(f => ({ file: f, path: path.join(productsDir, f) }));
}

function readDisplayName(filePath, fallbackName) {
  const content = fs.readFileSync(filePath, 'utf8');
  // try <h1> first
  const h1 = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1 && h1[1]) return h1[1].trim();
  // try <title>
  const title = content.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title && title[1]) return title[1].trim();
  // fallback
  return fallbackName;
}

function buildListItems(files) {
  const items = files.map(f => {
    const fallback = readableNameFromFilename(f.file);
    const name = readDisplayName(f.path, fallback);
    return { file: f.file, name };
  });

  // sort by name
  items.sort((a,b) => a.name.localeCompare(b.name, undefined, {sensitivity: 'base'}));

  // build HTML for each list item (matching existing products.html structure)
  return items.map(it => {
    const n = escapeAttr(it.name);
    return [
'        <li class="product-item" data-name="' + n + '">',
`          <a href="products/${it.file}">${it.name}</a>`,
'          <span class="cas"></span>',
'        </li>'
    ].join('\n');
  }).join('\n');
}

function updateProductsHtml(newListHtml) {
  let content = fs.readFileSync(productsHtmlPath, 'utf8');

  // Replace the inner content of <ul id="productList"> ... </ul>
  const re = /(<ul\s+id=["']productList["'][^>]*>)[\s\S]*?(<\/ul>)/i;
  if (!re.test(content)) {
    console.error('Cannot find <ul id="productList"> in products.html');
    process.exit(2);
  }
  const replaced = content.replace(re, `$1\n${newListHtml}\n        $2`);
  fs.writeFileSync(productsHtmlPath, replaced, 'utf8');
  console.log('products.html updated with', newListHtml.split('\n').length, 'list lines.');
}

function main() {
  if (!fs.existsSync(productsDir)) {
    console.error('products/ directory not found');
    process.exit(1);
  }
  const files = getFiles();
  if (files.length === 0) {
    console.log('No product HTML files found in products/. Nothing to do.');
    return;
  }
  const listHtml = buildListItems(files);
  updateProductsHtml(listHtml);
}

main();