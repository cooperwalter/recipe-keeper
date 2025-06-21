#!/usr/bin/env tsx

import { readdir, stat } from 'fs/promises';
import { join, relative, dirname, basename } from 'path';

const projectRoot = process.cwd();

// Directories to exclude
const excludeDirs = new Set([
  'node_modules',
  '.next',
  'coverage',
  'dist',
  'build',
  '.git',
  'scripts',
  'e2e',
  '__mocks__',
]);

// Files to exclude
const excludeFiles = new Set([
  'tailwind.config.ts',
  'next.config.ts',
  'drizzle.config.ts',
  'vitest.config.ts',
  'vitest.config.api.ts',
  'vitest.config.e2e.ts',
  'vitest.config.unit.ts',
  'playwright.config.ts',
  'playwright-e2e.config.ts',
  'middleware.ts',
  'test/setup.tsx',
]);

// UI components that typically don't need tests
const uiComponentsToSkip = new Set([
  'alert-dialog.tsx',
  'alert.tsx',
  'badge.tsx',
  'button.tsx',
  'card.tsx',
  'checkbox.tsx',
  'dialog.tsx',
  'dropdown-menu.tsx',
  'input.tsx',
  'label.tsx',
  'pagination.tsx',
  'popover.tsx',
  'progress.tsx',
  'scroll-area.tsx',
  'select.tsx',
  'separator.tsx',
  'skeleton.tsx',
  'switch.tsx',
  'tabs.tsx',
  'textarea.tsx',
  'toast.tsx',
  'toaster.tsx',
  'toggle-group.tsx',
  'toggle.tsx',
  'tooltip.tsx',
]);

// Simple pages that may not need tests
const simplePagesToSkip = new Set([
  'robots.ts',
  'sitemap.ts',
  'manifest.ts',
  'apple-icon.tsx',
  'icon.tsx',
  'opengraph-image.tsx',
  'twitter-image.tsx',
  'layout.tsx',
  'loading.tsx',
  'error.tsx',
  'not-found.tsx',
]);

async function getAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const items = await readdir(dir);

  for (const item of items) {
    if (excludeDirs.has(item)) continue;

    const fullPath = join(dir, item);
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      files.push(...(await getAllFiles(fullPath)));
    } else if (
      stats.isFile() &&
      (item.endsWith('.ts') || item.endsWith('.tsx')) &&
      !item.includes('.test.') &&
      !item.includes('.d.')
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

async function findTestFile(sourceFile: string): Promise<string | null> {
  const dir = dirname(sourceFile);
  const base = basename(sourceFile);
  const nameWithoutExt = base.replace(/\.(ts|tsx)$/, '');
  const ext = base.endsWith('.tsx') ? 'tsx' : 'ts';

  // Possible test file locations
  const testPaths = [
    // Same directory
    join(dir, `${nameWithoutExt}.test.${ext}`),
    join(dir, `${nameWithoutExt}.spec.${ext}`),
    // __tests__ subdirectory
    join(dir, '__tests__', `${nameWithoutExt}.test.${ext}`),
    join(dir, '__tests__', `${nameWithoutExt}.spec.${ext}`),
    // Root __tests__ directory with path mirroring
    join(projectRoot, '__tests__', relative(projectRoot, sourceFile).replace(/\.(ts|tsx)$/, `.test.${ext}`)),
  ];

  for (const testPath of testPaths) {
    try {
      await stat(testPath);
      return testPath;
    } catch {
      // File doesn't exist
    }
  }

  return null;
}

async function analyzeTestCoverage() {
  console.log('Analyzing test coverage for TypeScript files...\n');

  const sourceFiles = await getAllFiles(projectRoot);
  const results = {
    tested: [] as string[],
    missing: [] as string[],
    skipped: [] as string[],
  };

  for (const file of sourceFiles) {
    const relativePath = relative(projectRoot, file);
    const fileName = basename(file);

    // Skip excluded files
    if (excludeFiles.has(fileName)) {
      results.skipped.push(relativePath);
      continue;
    }

    // Skip UI components
    if (relativePath.startsWith('components/ui/') && uiComponentsToSkip.has(fileName)) {
      results.skipped.push(relativePath);
      continue;
    }

    // Skip simple pages
    if (simplePagesToSkip.has(fileName)) {
      results.skipped.push(relativePath);
      continue;
    }

    const testFile = await findTestFile(file);
    if (testFile) {
      results.tested.push(relativePath);
    } else {
      results.missing.push(relativePath);
    }
  }

  // Print results
  console.log(`📊 Test Coverage Summary:`);
  console.log(`✅ Files with tests: ${results.tested.length}`);
  console.log(`❌ Files missing tests: ${results.missing.length}`);
  console.log(`⏭️  Files skipped: ${results.skipped.length}`);
  console.log(`📈 Coverage: ${((results.tested.length / (results.tested.length + results.missing.length)) * 100).toFixed(1)}%\n`);

  if (results.missing.length > 0) {
    console.log('❌ Files missing tests:');
    results.missing.forEach(file => console.log(`   - ${file}`));
  }

  console.log('\n✅ Files with tests:');
  results.tested.forEach(file => console.log(`   - ${file}`));
}

analyzeTestCoverage().catch(console.error);