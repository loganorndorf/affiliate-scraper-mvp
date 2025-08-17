/**
 * Reliability Report Generator
 * 
 * Generates beautiful console reports, HTML exports, and data exports
 * for extractor reliability testing results.
 */

const chalk = require('chalk');
const Table = require('cli-table3');
import { TestResult, TestSummary, ErrorType } from '../core/ExtractorTester';
import { calculatePlatformHealth, compareWithBaseline, BaselineComparison, PlatformHealth } from '../core/metrics';

export interface ReportOptions {
  includeDetails?: boolean;
  includeTrends?: boolean;
  colorOutput?: boolean;
  showRecommendations?: boolean;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'html' | 'markdown';
  filename?: string;
  includeRawData?: boolean;
}

export interface RecommendationItem {
  platform: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
  reason: string;
  priority: number;
}

export class ReliabilityReport {
  private results: TestResult[];
  private summary: TestSummary;
  private baseline?: TestSummary;

  constructor(results: TestResult[], baseline?: TestSummary) {
    this.results = results;
    this.summary = this.generateSummary(results);
    this.baseline = baseline;
  }

  /**
   * Generate comprehensive console report
   */
  generateConsoleReport(options: ReportOptions = {}): void {
    const {
      includeDetails = true,
      includeTrends = false,
      colorOutput = true,
      showRecommendations = true
    } = options;

    console.clear();
    
    // Header
    this.printHeader();
    
    // Summary section
    this.printSummary();
    
    // Platform details table
    this.printPlatformTable();
    
    // Error analysis
    if (includeDetails) {
      this.printErrorAnalysis();
    }
    
    // Recommendations
    if (showRecommendations) {
      this.printRecommendations();
    }
    
    // Trend analysis
    if (includeTrends && this.baseline) {
      this.printTrendAnalysis();
    }
    
    // Footer
    this.printFooter();
  }

  /**
   * Print formatted header
   */
  private printHeader(): void {
    const border = '═'.repeat(80);
    const title = '🧪 EXTRACTOR RELIABILITY REPORT';
    const timestamp = new Date().toLocaleString();
    
    console.log(chalk.cyan(border));
    console.log(chalk.cyan.bold(title.padStart((80 + title.length) / 2)));
    console.log(chalk.gray(`Generated: ${timestamp}`.padStart((80 + timestamp.length) / 2)));
    console.log(chalk.cyan(border));
    console.log();
  }

  /**
   * Print summary section
   */
  private printSummary(): void {
    console.log(chalk.yellow.bold('📊 SUMMARY'));
    console.log(chalk.yellow('─'.repeat(40)));
    
    const overallHealth = this.calculateOverallHealth();
    const healthColor = this.getHealthColor(overallHealth);
    
    console.log(`Total Platforms Tested: ${chalk.bold(Object.keys(this.summary.platformResults).length)}`);
    console.log(`Total Test Runs: ${chalk.bold(this.summary.totalTests)}`);
    console.log(`Overall Success Rate: ${this.colorizePercentage(this.summary.successRate)}`);
    console.log(`Average Response Time: ${this.colorizeResponseTime(this.summary.averageResponseTime)}`);
    console.log(`Overall Health Score: ${healthColor(Math.round(overallHealth) + '/100')}`);
    
    const criticalIssues = this.getCriticalIssuesCount();
    if (criticalIssues > 0) {
      console.log(chalk.red.bold(`🚨 Critical Issues: ${criticalIssues}`));
    }
    
    console.log();
  }

  /**
   * Print platform details table
   */
  private printPlatformTable(): void {
    console.log(chalk.yellow.bold('🔍 PLATFORM BREAKDOWN'));
    console.log(chalk.yellow('─'.repeat(40)));
    
    const table = new Table({
      head: [
        chalk.bold('Platform'),
        chalk.bold('Success Rate'),
        chalk.bold('Accuracy'),
        chalk.bold('Response Time'),
        chalk.bold('Status'),
        chalk.bold('Tests')
      ],
      style: { 'padding-left': 1, 'padding-right': 1 }
    });

    for (const [platform, health] of Object.entries(this.summary.platformResults)) {
      const statusColor = this.getStatusColor(health.status);
      const emoji = this.getStatusEmoji(health.status);
      
      table.push([
        chalk.bold(platform.toUpperCase()),
        this.colorizePercentage(health.successRate),
        this.colorizePercentage(health.averageAccuracy),
        this.colorizeResponseTime(health.averageResponseTime),
        statusColor(`${emoji} ${health.status}`),
        health.testsRun.toString()
      ]);
    }

    console.log(table.toString());
    console.log();
  }

  /**
   * Print error analysis section
   */
  private printErrorAnalysis(): void {
    const hasErrors = Object.keys(this.summary.errorBreakdown).length > 0;
    
    if (!hasErrors) {
      console.log(chalk.green.bold('✅ NO ERRORS DETECTED'));
      console.log();
      return;
    }

    console.log(chalk.yellow.bold('🚨 ERROR ANALYSIS'));
    console.log(chalk.yellow('─'.repeat(40)));

    const errorTable = new Table({
      head: [chalk.bold('Error Type'), chalk.bold('Count'), chalk.bold('Affected Platforms')],
      style: { 'padding-left': 1, 'padding-right': 1 }
    });

    for (const [errorType, count] of Object.entries(this.summary.errorBreakdown)) {
      const affectedPlatforms = this.getAffectedPlatforms(errorType as ErrorType);
      const severity = this.getErrorSeverity(errorType as ErrorType);
      
      errorTable.push([
        severity(errorType),
        chalk.bold(count.toString()),
        affectedPlatforms.join(', ')
      ]);
    }

    console.log(errorTable.toString());
    console.log();
  }

  /**
   * Print prioritized recommendations
   */
  private printRecommendations(): void {
    const recommendations = this.generateRecommendations();
    
    if (recommendations.length === 0) {
      console.log(chalk.green.bold('🎉 ALL EXTRACTORS HEALTHY - NO ACTIONS NEEDED'));
      console.log();
      return;
    }

    console.log(chalk.yellow.bold('💡 RECOMMENDATIONS'));
    console.log(chalk.yellow('─'.repeat(40)));

    const groupedRecs = this.groupRecommendationsBySeverity(recommendations);

    for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const) {
      const recs = groupedRecs[severity];
      if (recs.length === 0) continue;

      const severityColor = this.getSeverityColor(severity);
      console.log(severityColor.bold(`\n${severity} PRIORITY:`));
      
      recs.forEach((rec, index) => {
        const bullet = severity === 'CRITICAL' ? '🚨' : severity === 'HIGH' ? '⚠️' : '💡';
        console.log(`${bullet} ${severityColor(rec.platform.toUpperCase())}: ${rec.action}`);
        console.log(`   Reason: ${chalk.gray(rec.reason)}`);
      });
    }
    
    console.log();
  }

  /**
   * Print trend analysis compared to baseline
   */
  private printTrendAnalysis(): void {
    if (!this.baseline) return;

    console.log(chalk.yellow.bold('📈 TREND ANALYSIS'));
    console.log(chalk.yellow('─'.repeat(40)));

    for (const [platform, currentHealth] of Object.entries(this.summary.platformResults)) {
      const baselineHealth = this.baseline.platformResults[platform];
      if (!baselineHealth) continue;

      const comparison = compareWithBaseline(currentHealth, baselineHealth);
      const trendColor = this.getTrendColor(comparison.overallChange);
      const trendEmoji = this.getTrendEmoji(comparison.overallChange);

      console.log(`${trendEmoji} ${chalk.bold(platform.toUpperCase())}: ${trendColor(comparison.overallChange)}`);
      
      if (comparison.successRateChange !== 0) {
        const changeColor = comparison.successRateChange > 0 ? chalk.green : chalk.red;
        console.log(`   Success Rate: ${changeColor(this.formatChange(comparison.successRateChange, '%'))}`);
      }
      
      if (comparison.accuracyChange !== 0) {
        const changeColor = comparison.accuracyChange > 0 ? chalk.green : chalk.red;
        console.log(`   Accuracy: ${changeColor(this.formatChange(comparison.accuracyChange, '%'))}`);
      }

      // Show alerts
      comparison.alerts.forEach(alert => {
        const alertColor = this.getSeverityColor(alert.severity.toUpperCase() as any);
        console.log(`   ${alertColor('⚠️ ' + alert.message)}`);
      });
    }
    
    console.log();
  }

  /**
   * Print footer with next steps
   */
  private printFooter(): void {
    const border = '═'.repeat(80);
    console.log(chalk.cyan(border));
    console.log(chalk.gray('💾 Results saved to ./tests/results/'));
    console.log(chalk.gray('🔄 Run "npm run test:reliability" to test again'));
    console.log(chalk.gray('📊 Use "npm run test:reliability -- --platform=<name>" to test specific platform'));
    console.log(chalk.cyan(border));
  }

  /**
   * Export report in various formats
   */
  async exportReport(options: ExportOptions): Promise<string> {
    const { format, filename, includeRawData = false } = options;
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const defaultFilename = `reliability_report_${timestamp}`;

    switch (format) {
      case 'json':
        return this.exportJSON(filename || `${defaultFilename}.json`, includeRawData);
      case 'csv':
        return this.exportCSV(filename || `${defaultFilename}.csv`);
      case 'html':
        return this.exportHTML(filename || `${defaultFilename}.html`);
      case 'markdown':
        return this.exportMarkdown(filename || `${defaultFilename}.md`);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export as JSON
   */
  private async exportJSON(filename: string, includeRawData: boolean): Promise<string> {
    const fs = require('fs').promises;
    const path = `./tests/results/${filename}`;

    const exportData = {
      summary: this.summary,
      recommendations: this.generateRecommendations(),
      timestamp: new Date().toISOString(),
      ...(includeRawData && { rawResults: this.results })
    };

    await fs.mkdir('./tests/results', { recursive: true });
    await fs.writeFile(path, JSON.stringify(exportData, null, 2));
    
    return path;
  }

  /**
   * Export as CSV
   */
  private async exportCSV(filename: string): Promise<string> {
    const fs = require('fs').promises;
    const path = `./tests/results/${filename}`;

    const headers = [
      'Platform',
      'Success Rate (%)',
      'Accuracy (%)',
      'Completeness (%)',
      'Avg Response Time (ms)',
      'Total Tests',
      'Status',
      'Primary Errors'
    ];

    const rows = Object.entries(this.summary.platformResults).map(([platform, health]) => {
      const primaryErrors = Object.entries(health.errors.reduce((acc, err) => {
        acc[err.type] = (acc[err.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>))
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2)
        .map(([type]) => type)
        .join(', ');

      return [
        platform,
        health.successRate.toFixed(1),
        health.averageAccuracy.toFixed(1),
        health.averageCompleteness.toFixed(1),
        health.averageResponseTime.toString(),
        health.testsRun.toString(),
        health.status,
        primaryErrors || 'None'
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    await fs.mkdir('./tests/results', { recursive: true });
    await fs.writeFile(path, csvContent);
    
    return path;
  }

  /**
   * Export as HTML
   */
  private async exportHTML(filename: string): Promise<string> {
    const fs = require('fs').promises;
    const path = `./tests/results/${filename}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Extractor Reliability Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui; margin: 40px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { color: #2563eb; border-bottom: 3px solid #e5e7eb; padding-bottom: 16px; }
        h2 { color: #374151; margin-top: 32px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f3f4f6; padding: 16px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; }
        .metric-label { color: #6b7280; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
        .status-excellent { color: #059669; }
        .status-healthy { color: #0891b2; }
        .status-warning { color: #d97706; }
        .status-critical { color: #dc2626; }
        .recommendation { margin: 8px 0; padding: 12px; border-left: 4px solid; border-radius: 4px; }
        .rec-critical { background: #fef2f2; border-color: #dc2626; }
        .rec-high { background: #fefbf2; border-color: #f59e0b; }
        .rec-medium { background: #f0f9ff; border-color: #3b82f6; }
        .rec-low { background: #f0fdf4; border-color: #10b981; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Extractor Reliability Report</h1>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${this.summary.successRate.toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${this.summary.averageAccuracy.toFixed(1)}%</div>
                <div class="metric-label">Average Accuracy</div>
            </div>
            <div class="metric">
                <div class="metric-value">${this.summary.averageResponseTime}ms</div>
                <div class="metric-label">Avg Response Time</div>
            </div>
            <div class="metric">
                <div class="metric-value">${Object.keys(this.summary.platformResults).length}</div>
                <div class="metric-label">Platforms Tested</div>
            </div>
        </div>

        <h2>Platform Details</h2>
        <table>
            <thead>
                <tr>
                    <th>Platform</th>
                    <th>Success Rate</th>
                    <th>Accuracy</th>
                    <th>Response Time</th>
                    <th>Status</th>
                    <th>Tests Run</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(this.summary.platformResults).map(([platform, health]) => `
                <tr>
                    <td><strong>${platform.toUpperCase()}</strong></td>
                    <td>${health.successRate.toFixed(1)}%</td>
                    <td>${health.averageAccuracy.toFixed(1)}%</td>
                    <td>${health.averageResponseTime}ms</td>
                    <td class="status-${health.status.toLowerCase()}">${this.getStatusEmoji(health.status)} ${health.status}</td>
                    <td>${health.testsRun}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>Recommendations</h2>
        ${this.generateRecommendations().map(rec => `
        <div class="recommendation rec-${rec.severity.toLowerCase()}">
            <strong>${rec.platform.toUpperCase()}</strong> - ${rec.severity} Priority<br>
            <strong>Action:</strong> ${rec.action}<br>
            <strong>Reason:</strong> ${rec.reason}
        </div>
        `).join('')}

        <p style="margin-top: 40px; color: #6b7280; font-size: 14px;">
            Generated on ${new Date().toLocaleString()}
        </p>
    </div>
</body>
</html>`;

    await fs.mkdir('./tests/results', { recursive: true });
    await fs.writeFile(path, html);
    
    return path;
  }

  /**
   * Export as Markdown
   */
  private async exportMarkdown(filename: string): Promise<string> {
    const fs = require('fs').promises;
    const path = `./tests/results/${filename}`;

    const markdown = `# 🧪 Extractor Reliability Report

*Generated: ${new Date().toLocaleString()}*

## 📊 Summary

- **Total Platforms Tested:** ${Object.keys(this.summary.platformResults).length}
- **Overall Success Rate:** ${this.summary.successRate.toFixed(1)}%
- **Average Accuracy:** ${this.summary.averageAccuracy.toFixed(1)}%
- **Average Response Time:** ${this.summary.averageResponseTime}ms

## 🔍 Platform Breakdown

| Platform | Success Rate | Accuracy | Response Time | Status | Tests |
|----------|-------------|----------|---------------|--------|-------|
${Object.entries(this.summary.platformResults).map(([platform, health]) => 
  `| ${platform.toUpperCase()} | ${health.successRate.toFixed(1)}% | ${health.averageAccuracy.toFixed(1)}% | ${health.averageResponseTime}ms | ${this.getStatusEmoji(health.status)} ${health.status} | ${health.testsRun} |`
).join('\n')}

## 💡 Recommendations

${this.generateRecommendations().map(rec => 
  `### ${rec.severity} - ${rec.platform.toUpperCase()}\n**Action:** ${rec.action}\n\n**Reason:** ${rec.reason}\n`
).join('\n')}

## 🚨 Error Summary

${Object.entries(this.summary.errorBreakdown).length > 0 
  ? Object.entries(this.summary.errorBreakdown).map(([error, count]) => 
      `- **${error}:** ${count} occurrences`
    ).join('\n')
  : '✅ No errors detected'
}
`;

    await fs.mkdir('./tests/results', { recursive: true });
    await fs.writeFile(path, markdown);
    
    return path;
  }

  /**
   * Generate prioritized recommendations
   */
  private generateRecommendations(): RecommendationItem[] {
    const recommendations: RecommendationItem[] = [];

    for (const [platform, health] of Object.entries(this.summary.platformResults)) {
      if (health.successRate < 50) {
        recommendations.push({
          platform,
          severity: 'CRITICAL',
          action: 'Fix immediately - blocking core functionality',
          reason: `Success rate is only ${health.successRate.toFixed(1)}%`,
          priority: 1
        });
      } else if (health.successRate < 70) {
        recommendations.push({
          platform,
          severity: 'HIGH',
          action: 'Investigate and fix major issues',
          reason: `Success rate below target (${health.successRate.toFixed(1)}% < 70%)`,
          priority: 2
        });
      } else if (health.averageAccuracy < 80) {
        recommendations.push({
          platform,
          severity: 'MEDIUM',
          action: 'Improve data accuracy',
          reason: `Accuracy below target (${health.averageAccuracy.toFixed(1)}% < 80%)`,
          priority: 3
        });
      } else if (health.averageResponseTime > 10000) {
        recommendations.push({
          platform,
          severity: 'LOW',
          action: 'Optimize for better performance',
          reason: `Response time above target (${health.averageResponseTime}ms > 10s)`,
          priority: 4
        });
      }

      // Error-specific recommendations
      health.errors.forEach(error => {
        if (error.type === ErrorType.SELECTOR_NOT_FOUND) {
          recommendations.push({
            platform,
            severity: 'HIGH',
            action: 'Update HTML selectors - platform changed structure',
            reason: 'Selector not found errors indicate HTML structure changes',
            priority: 2
          });
        } else if (error.type === ErrorType.RATE_LIMITED) {
          recommendations.push({
            platform,
            severity: 'MEDIUM',
            action: 'Implement rate limiting and proxy rotation',
            reason: 'Platform is blocking requests due to rate limits',
            priority: 3
          });
        }
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Helper methods for formatting and colors
   */
  private generateSummary(results: TestResult[]): TestSummary {
    const successful = results.filter(r => r.success);
    const platformGroups = this.groupBy(results, 'platform');
    const platformResults: Record<string, any> = {};

    for (const [platform, platformTests] of Object.entries(platformGroups)) {
      platformResults[platform] = calculatePlatformHealth(platformTests, platform);
    }

    const errorBreakdown: Record<ErrorType, number> = {} as any;
    results.filter(r => !r.success).forEach(result => {
      if (result.errorDetails) {
        const errorType = result.errorDetails.type;
        errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
      }
    });

    return {
      totalTests: results.length,
      successfulTests: successful.length,
      failedTests: results.length - successful.length,
      successRate: (successful.length / results.length) * 100,
      averageResponseTime: Math.round(results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length),
      averageAccuracy: Math.round(successful.reduce((sum, r) => sum + r.accuracyScore, 0) / successful.length) || 0,
      platformResults,
      errorBreakdown,
      timestamp: new Date()
    };
  }

  private calculateOverallHealth(): number {
    const platforms = Object.values(this.summary.platformResults);
    return platforms.reduce((sum, p) => sum + (p.successRate * 0.7 + p.averageAccuracy * 0.3), 0) / platforms.length;
  }

  private getCriticalIssuesCount(): number {
    return Object.values(this.summary.platformResults).filter(p => p.status === 'CRITICAL').length;
  }

  private colorizePercentage(percentage: number): string {
    if (percentage >= 90) return chalk.green.bold(`${percentage.toFixed(1)}%`);
    if (percentage >= 70) return chalk.yellow.bold(`${percentage.toFixed(1)}%`);
    return chalk.red.bold(`${percentage.toFixed(1)}%`);
  }

  private colorizeResponseTime(timeMs: number): string {
    if (timeMs <= 3000) return chalk.green.bold(`${timeMs}ms`);
    if (timeMs <= 10000) return chalk.yellow.bold(`${timeMs}ms`);
    return chalk.red.bold(`${timeMs}ms`);
  }

  private getHealthColor(score: number) {
    if (score >= 90) return chalk.green.bold;
    if (score >= 75) return chalk.blue.bold;
    if (score >= 50) return chalk.yellow.bold;
    return chalk.red.bold;
  }

  private getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case 'excellent': return chalk.green.bold;
      case 'healthy': return chalk.blue.bold;
      case 'warning': return chalk.yellow.bold;
      case 'critical': return chalk.red.bold;
      default: return chalk.gray;
    }
  }

  private getStatusEmoji(status: string): string {
    switch (status.toLowerCase()) {
      case 'excellent': return '🚀';
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '🚨';
      default: return '❓';
    }
  }

  private getSeverityColor(severity: string) {
    switch (severity) {
      case 'CRITICAL': return chalk.red.bold;
      case 'HIGH': return chalk.magenta.bold;
      case 'MEDIUM': return chalk.yellow.bold;
      case 'LOW': return chalk.blue.bold;
      default: return chalk.gray;
    }
  }

  private getErrorSeverity(errorType: ErrorType) {
    switch (errorType) {
      case ErrorType.SELECTOR_NOT_FOUND:
      case ErrorType.AUTH_REQUIRED:
        return chalk.red.bold;
      case ErrorType.RATE_LIMITED:
      case ErrorType.CAPTCHA_REQUIRED:
        return chalk.yellow.bold;
      case ErrorType.TIMEOUT:
      case ErrorType.NETWORK_ERROR:
        return chalk.blue.bold;
      case ErrorType.NOT_FOUND:
        return chalk.gray;
      default:
        return chalk.magenta;
    }
  }

  private getTrendColor(trend: string) {
    switch (trend) {
      case 'improved': return chalk.green.bold;
      case 'stable': return chalk.blue;
      case 'degraded': return chalk.red.bold;
      default: return chalk.gray;
    }
  }

  private getTrendEmoji(trend: string): string {
    switch (trend) {
      case 'improved': return '📈';
      case 'stable': return '➡️';
      case 'degraded': return '📉';
      default: return '❓';
    }
  }

  private formatChange(change: number, unit: string): string {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}${unit}`;
  }

  private getAffectedPlatforms(errorType: ErrorType): string[] {
    const platforms = new Set<string>();
    
    this.results
      .filter(r => r.errorDetails?.type === errorType)
      .forEach(r => platforms.add(r.platform));
    
    return Array.from(platforms);
  }

  private groupRecommendationsBySeverity(recommendations: RecommendationItem[]) {
    return {
      CRITICAL: recommendations.filter(r => r.severity === 'CRITICAL'),
      HIGH: recommendations.filter(r => r.severity === 'HIGH'),
      MEDIUM: recommendations.filter(r => r.severity === 'MEDIUM'),
      LOW: recommendations.filter(r => r.severity === 'LOW')
    };
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = (item[key] as unknown as string);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
}