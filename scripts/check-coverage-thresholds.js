#!/usr/bin/env node

/**
 * Coverage Threshold Checker
 * 
 * This script checks if the test coverage meets the defined thresholds
 * and provides detailed reporting for CI/CD pipelines.
 */

const fs = require('fs');
const path = require('path');

// Coverage thresholds configuration
const THRESHOLDS = {
  lines: 90,
  functions: 95,
  branches: 85,
  statements: 90
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * Format percentage with color coding
 */
function formatPercentage(value, threshold) {
  const color = value >= threshold ? colors.green : colors.red;
  const status = value >= threshold ? '✅' : '❌';
  return `${color}${value.toFixed(2)}%${colors.reset} ${status}`;
}

/**
 * Print coverage summary table
 */
function printCoverageSummary(coverage) {
  console.log(`\n${colors.bold}📊 SCM Test Coverage Report${colors.reset}`);
  console.log('═'.repeat(60));
  
  const metrics = ['lines', 'functions', 'branches', 'statements'];
  
  // Table header
  console.log(`${colors.bold}Metric${colors.reset}`.padEnd(20) + 
              `${colors.bold}Coverage${colors.reset}`.padEnd(15) + 
              `${colors.bold}Threshold${colors.reset}`.padEnd(15) + 
              `${colors.bold}Status${colors.reset}`);
  console.log('─'.repeat(60));
  
  // Table rows
  metrics.forEach(metric => {
    const actual = coverage.total[metric].pct;
    const threshold = THRESHOLDS[metric];
    const status = actual >= threshold ? '✅ PASS' : '❌ FAIL';
    const statusColor = actual >= threshold ? colors.green : colors.red;
    
    console.log(
      metric.padEnd(20) + 
      `${actual.toFixed(2)}%`.padEnd(15) + 
      `${threshold}%`.padEnd(15) + 
      `${statusColor}${status}${colors.reset}`
    );
  });
  
  console.log('─'.repeat(60));
}

/**
 * Print detailed file coverage
 */
function printDetailedCoverage(coverage) {
  console.log(`\n${colors.bold}📁 File Coverage Details${colors.reset}`);
  console.log('═'.repeat(80));
  
  const files = Object.entries(coverage)
    .filter(([key]) => key !== 'total')
    .sort(([, a], [, b]) => a.lines.pct - b.lines.pct);
  
  if (files.length === 0) {
    console.log('No file coverage data available');
    return;
  }
  
  // Show files with low coverage
  const lowCoverageFiles = files.filter(([, data]) => 
    data.lines.pct < THRESHOLDS.lines ||
    data.functions.pct < THRESHOLDS.functions ||
    data.branches.pct < THRESHOLDS.branches ||
    data.statements.pct < THRESHOLDS.statements
  );
  
  if (lowCoverageFiles.length > 0) {
    console.log(`\n${colors.yellow}⚠️  Files Below Threshold:${colors.reset}`);
    lowCoverageFiles.forEach(([file, data]) => {
      const relativePath = path.relative(process.cwd(), file);
      console.log(`\n📄 ${colors.blue}${relativePath}${colors.reset}`);
      console.log(`   Lines: ${formatPercentage(data.lines.pct, THRESHOLDS.lines)}`);
      console.log(`   Functions: ${formatPercentage(data.functions.pct, THRESHOLDS.functions)}`);
      console.log(`   Branches: ${formatPercentage(data.branches.pct, THRESHOLDS.branches)}`);
      console.log(`   Statements: ${formatPercentage(data.statements.pct, THRESHOLDS.statements)}`);
    });
  }
  
  // Show top performing files
  const topFiles = files.slice(-5).reverse();
  console.log(`\n${colors.green}🏆 Top Performing Files:${colors.reset}`);
  topFiles.forEach(([file, data]) => {
    const relativePath = path.relative(process.cwd(), file);
    console.log(`📄 ${colors.blue}${relativePath}${colors.reset} - Lines: ${colors.green}${data.lines.pct.toFixed(2)}%${colors.reset}`);
  });
}

/**
 * Generate coverage badge data
 */
function generateBadgeData(coverage) {
  const overallCoverage = coverage.total.lines.pct;
  let color = 'red';
  
  if (overallCoverage >= 90) color = 'brightgreen';
  else if (overallCoverage >= 80) color = 'yellow';
  else if (overallCoverage >= 70) color = 'orange';
  
  const badgeData = {
    schemaVersion: 1,
    label: 'coverage',
    message: `${overallCoverage.toFixed(1)}%`,
    color: color
  };
  
  // Write badge data for shields.io
  const badgeDir = path.join(process.cwd(), 'coverage');
  if (!fs.existsSync(badgeDir)) {
    fs.mkdirSync(badgeDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(badgeDir, 'badge.json'),
    JSON.stringify(badgeData, null, 2)
  );
  
  console.log(`\n${colors.blue}📛 Coverage badge generated: coverage/badge.json${colors.reset}`);
}

/**
 * Generate coverage trends data
 */
function generateTrendsData(coverage) {
  const trendsFile = path.join(process.cwd(), 'coverage', 'trends.json');
  let trends = [];
  
  // Load existing trends data
  if (fs.existsSync(trendsFile)) {
    try {
      trends = JSON.parse(fs.readFileSync(trendsFile, 'utf8'));
    } catch (error) {
      console.warn(`Warning: Could not parse trends file: ${error.message}`);
      trends = [];
    }
  }
  
  // Add current coverage data
  const currentData = {
    timestamp: new Date().toISOString(),
    coverage: {
      lines: coverage.total.lines.pct,
      functions: coverage.total.functions.pct,
      branches: coverage.total.branches.pct,
      statements: coverage.total.statements.pct
    }
  };
  
  trends.push(currentData);
  
  // Keep only last 30 entries
  if (trends.length > 30) {
    trends = trends.slice(-30);
  }
  
  // Write trends data
  fs.writeFileSync(trendsFile, JSON.stringify(trends, null, 2));
  
  // Show trend analysis
  if (trends.length > 1) {
    const previous = trends[trends.length - 2];
    const current = trends[trends.length - 1];
    
    console.log(`\n${colors.bold}📈 Coverage Trends${colors.reset}`);
    console.log('─'.repeat(40));
    
    Object.keys(current.coverage).forEach(metric => {
      const prev = previous.coverage[metric];
      const curr = current.coverage[metric];
      const diff = curr - prev;
      const arrow = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️';
      const diffColor = diff > 0 ? colors.green : diff < 0 ? colors.red : colors.yellow;
      
      console.log(`${metric}: ${diffColor}${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%${colors.reset} ${arrow}`);
    });
  }
}

/**
 * Main function
 */
function main() {
  const coverageFile = process.argv[2] || path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  
  // Check if coverage file exists
  if (!fs.existsSync(coverageFile)) {
    console.error(`${colors.red}❌ Coverage file not found: ${coverageFile}${colors.reset}`);
    console.error('Please run tests with coverage first: npm run test -- --coverage');
    process.exit(1);
  }
  
  let coverage;
  try {
    coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
  } catch (error) {
    console.error(`${colors.red}❌ Error parsing coverage file: ${error.message}${colors.reset}`);
    process.exit(1);
  }
  
  // Print coverage summary
  printCoverageSummary(coverage);
  
  // Print detailed coverage if requested
  if (process.argv.includes('--detailed')) {
    printDetailedCoverage(coverage);
  }
  
  // Generate badge data
  generateBadgeData(coverage);
  
  // Generate trends data
  generateTrendsData(coverage);
  
  // Check thresholds
  let failed = false;
  const failedMetrics = [];
  
  Object.entries(THRESHOLDS).forEach(([metric, threshold]) => {
    const actual = coverage.total[metric].pct;
    if (actual < threshold) {
      failed = true;
      failedMetrics.push({
        metric,
        actual: actual.toFixed(2),
        threshold
      });
    }
  });
  
  if (failed) {
    console.log(`\n${colors.red}${colors.bold}❌ Coverage thresholds not met!${colors.reset}`);
    console.log(`\n${colors.yellow}Failed metrics:${colors.reset}`);
    failedMetrics.forEach(({ metric, actual, threshold }) => {
      console.log(`  • ${metric}: ${actual}% < ${threshold}%`);
    });
    
    console.log(`\n${colors.blue}💡 To improve coverage:${colors.reset}`);
    console.log('  1. Add tests for uncovered lines');
    console.log('  2. Test error handling paths');
    console.log('  3. Add edge case tests');
    console.log('  4. Review and test all branches');
    
    if (process.env.CI) {
      console.log(`\n${colors.yellow}ℹ️  Running in CI mode - this will fail the build${colors.reset}`);
    }
    
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bold}✅ All coverage thresholds met!${colors.reset}`);
    
    // Calculate overall score
    const totalScore = Object.values(coverage.total)
      .reduce((sum, metric) => sum + metric.pct, 0) / 4;
    
    console.log(`\n${colors.blue}📊 Overall Coverage Score: ${colors.bold}${totalScore.toFixed(2)}%${colors.reset}`);
    
    if (totalScore >= 95) {
      console.log(`${colors.green}🏆 Excellent coverage! Keep up the great work!${colors.reset}`);
    } else if (totalScore >= 90) {
      console.log(`${colors.green}👍 Good coverage! Consider adding more edge case tests.${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️  Coverage meets minimum requirements but could be improved.${colors.reset}`);
    }
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  THRESHOLDS,
  formatPercentage,
  printCoverageSummary,
  generateBadgeData
};