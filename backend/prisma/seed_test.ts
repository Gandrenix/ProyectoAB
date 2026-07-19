import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const csvFilePath = path.resolve(__dirname, '../../Base de datos Sistema Alimentos equivalentes .csv');
  const content = fs.readFileSync(csvFilePath, 'utf8');
  const lines = content.split('\n');
  console.log('--- CSV Headers Row 2 ---');
  console.log(lines[1]);
}

main();

