import fs from 'node:fs';
import path from 'node:path';

export function buildViewer(
  archivePath: string,
  chartJsPath: string,
  templatePath: string,
  outputPath: string,
): void {
  const archive = fs.existsSync(archivePath)
    ? (JSON.parse(fs.readFileSync(archivePath, 'utf-8')) as {
        days: unknown[];
        blocks?: unknown[];
        weeks?: unknown[];
      })
    : { days: [], blocks: [], weeks: [] };

  const chartJs = fs.readFileSync(chartJsPath, 'utf-8');
  const template = fs.readFileSync(templatePath, 'utf-8');

  const output = template
    .replace('[/*__DATA__*/]', JSON.stringify(archive.days ?? []))
    .replace('[/*__BLOCKS__*/]', JSON.stringify(archive.blocks ?? []))
    .replace('[/*__WEEKS__*/]', JSON.stringify(archive.weeks ?? []))
    .replace('/*__CHARTJS__*/', chartJs);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, output, 'utf-8');
}

const isMainModule = process.argv[1]?.endsWith('build-viewer.ts');
if (isMainModule) {
  const dataDir = process.env.CCUSAGE_ARCHIVE_DIR
    ? path.resolve(process.env.CCUSAGE_ARCHIVE_DIR)
    : path.resolve('data');

  const archivePath = path.join(dataDir, 'archive.json');
  const chartJsPath = path.resolve('node_modules/chart.js/dist/chart.umd.js');
  const templatePath = path.resolve('src/viewer/template.html');
  const outputPath = path.join(dataDir, 'viewer.html');

  buildViewer(archivePath, chartJsPath, templatePath, outputPath);
  console.log(`Viewer built: ${outputPath}`);
}
