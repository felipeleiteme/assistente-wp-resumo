#!/usr/bin/env node

/**
 * Script para atualizar referências de caminhos após reorganização
 */

const fs = require('fs');
const path = require('path');

const pathMappings = {
  'scripts/test-daily-summary.ts': 'tests/integration/test-daily-summary.ts',
  'scripts/test-weekly-report.ts': 'tests/integration/test-weekly-report.ts',
  'scripts/test-webhook-local.ts': 'tests/integration/test-webhook-local.ts',
  'scripts/verify-credentials.ts': 'tests/unit/verify-credentials.ts',
  'scripts/carbon-capital-report.ts': 'scripts/generate/carbon-capital-report.ts',
  'scripts/generate-carbon-real-report.ts': 'scripts/generate/generate-carbon-real-report.ts',
  'scripts/force-teams-notification.ts': 'scripts/notifications/force-teams-notification.ts',
  'scripts/clear-database.ts': 'scripts/database/clear-database.ts',
  'scripts/capture-webhook-structure.ts': 'scripts/debug/capture-webhook-structure.ts',
  'scripts/debug-groups.ts': 'scripts/debug/debug-groups.ts'
};

function updateFileReferences(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    Object.entries(pathMappings).forEach(([oldPath, newPath]) => {
      const regex = new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      content = content.replace(regex, newPath);
    });
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Atualizado: ${filePath}`);
  } catch (error) {
    console.log(`❌ Erro ao atualizar ${filePath}:`, error.message);
  }
}

function updateAllReferences() {
  console.log('🔄 Atualizando referências de caminhos...\n');
  
  // Atualizar package.json scripts
  if (fs.existsSync('package.json')) {
    updateFileReferences('package.json');
  }
  
  // Atualizar README.md se existir
  ['README.md', 'docs/README.md'].forEach(file => {
    if (fs.existsSync(file)) {
      updateFileReferences(file);
    }
  });
  
  // Atualizar NAVEGACAO.md
  if (fs.existsSync('NAVEGACAO.md')) {
    updateFileReferences('NAVEGACAO.md');
  }
  
  console.log('\n🎉 Atualização concluída!');
}

updateAllReferences();