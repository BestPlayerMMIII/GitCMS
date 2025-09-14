# Critical Testing Scenarios for Enhanced API Request Management

## Overview

This document provides comprehensive testing scenarios to validate the enhanced
API request management system under extreme conditions, edge cases, and stress
situations. These tests ensure the system remains robust and performant in
production environments.

## Table of Contents

1. [Cache Invalidation Stress Tests](#cache-invalidation-stress-tests)
2. [Concurrent Request Scenarios](#concurrent-request-scenarios)
3. [Network Failure Recovery](#network-failure-recovery)
4. [Memory Management Edge Cases](#memory-management-edge-cases)
5. [Race Condition Testing](#race-condition-testing)
6. [Cache Corruption Prevention](#cache-corruption-prevention)
7. [TTL Boundary Testing](#ttl-boundary-testing)
8. [Repository Switch Scenarios](#repository-switch-scenarios)
9. [Bulk Operations Testing](#bulk-operations-testing)
10. [Performance Degradation Scenarios](#performance-degradation-scenarios)

---

## Cache Invalidation Stress Tests

### Scenario 1: Rapid Sequential Mutations

**Objective**: Test cache invalidation under rapid sequential schema/content
mutations.

**Test Steps**:

1. Navigate to schemas page
2. Create 10 schemas in rapid succession (< 100ms intervals)
3. Delete 5 schemas immediately after creation
4. Modify remaining schemas rapidly
5. Switch between schemas and content pages

**Expected Behavior**:

- No stale data displayed
- No cache corruption
- All UI updates reflect latest state
- No memory leaks from accumulated invalidation events

**Test Code**:

```typescript
// In browser console
async function stressTestMutations() {
  const testData = Array.from({ length: 10 }, (_, i) => ({
    id: `stress-test-${i}`,
    name: `Stress Test Schema ${i}`,
    description: 'Rapid mutation test',
    fields: [],
  }));

  // Rapid creation
  for (const schema of testData) {
    await fetch('/api/schemas/storage?action=save&owner=test&repo=test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema }),
    });
    console.log(`Created schema ${schema.id}`);
  }

  // Rapid deletion
  for (let i = 0; i < 5; i++) {
    await fetch(
      `/api/schemas/storage?owner=test&repo=test&schemaId=stress-test-${i}`,
      {
        method: 'DELETE',
      }
    );
    console.log(`Deleted schema stress-test-${i}`);
  }
}
```

**Validation Checks**:

- [ ] Schemas page shows correct count after operations
- [ ] Content page doesn't show deleted schemas in dropdown
- [ ] No console errors or memory warnings
- [ ] Cache statistics show reasonable memory usage

### Scenario 2: Cross-Repository Invalidation Isolation

**Objective**: Ensure cache invalidation doesn't affect unrelated repositories.

**Test Steps**:

1. Open two browser tabs with different repositories
2. Perform mutations in Repository A
3. Verify Repository B data remains unchanged
4. Switch between repositories rapidly
5. Perform simultaneous mutations in both repositories

**Expected Behavior**:

- Repository B cache remains intact when Repository A is modified
- No cross-contamination between repository caches
- Repository switches work seamlessly

**Test Code**:

```typescript
// Open two tabs with different repos
// Tab 1: /schemas?owner=user1&repo=repo1
// Tab 2: /schemas?owner=user2&repo=repo2

// In Tab 1 console:
async function testRepoA() {
  await fetch('/api/schemas/storage?action=save&owner=user1&repo=repo1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schema: {
        id: 'repo-a-test',
        name: 'Repository A Test',
        fields: [],
      },
    }),
  });
}

// In Tab 2 console (should not be affected):
function validateRepoB() {
  // Check that repo B schemas remain unchanged
  const schemaElements = document.querySelectorAll('[data-schema-id]');
  console.log(
    'Repo B schemas:',
    Array.from(schemaElements).map(el => el.dataset.schemaId)
  );
}
```

---

## Concurrent Request Scenarios

### Scenario 3: Thundering Herd Protection

**Objective**: Test request deduplication under high concurrent load.

**Test Steps**:

1. Open 10 browser tabs to the same schemas page
2. Clear all caches
3. Refresh all tabs simultaneously (Ctrl+Shift+R)
4. Monitor network requests and cache behavior

**Expected Behavior**:

- Only one actual API request made despite 10 tab refreshes
- All tabs receive the same data
- No duplicate network requests
- Fast loading across all tabs

**Test Code**:

```typescript
// Run in multiple tabs simultaneously
async function simulateThunderingHerd() {
  // Clear cache first
  if (window.gitcmsCache) {
    window.gitcmsCache.clearAll();
  }

  // Simulate multiple concurrent requests
  const promises = Array.from({ length: 50 }, () =>
    fetch('/api/schemas/storage?action=list&owner=test&repo=test')
  );

  const startTime = performance.now();
  const results = await Promise.all(promises);
  const endTime = performance.now();

  console.log(`50 concurrent requests completed in ${endTime - startTime}ms`);
  console.log(
    'All requests successful:',
    results.every(r => r.ok)
  );
}
```

### Scenario 4: Mixed Request Types Under Load

**Objective**: Test system under mixed read/write operations.

**Test Steps**:

1. Start continuous read operations (schemas, content lists)
2. Simultaneously perform write operations (create, update, delete)
3. Monitor for race conditions and data consistency
4. Verify cache invalidation works correctly under load

**Test Code**:

```typescript
async function mixedLoadTest() {
  let stop = false;

  // Continuous reads
  const readInterval = setInterval(async () => {
    if (stop) return;
    try {
      await fetch('/api/schemas/storage?action=list&owner=test&repo=test');
      await fetch('/api/content?action=list&owner=test&repo=test');
    } catch (e) {
      console.error('Read error:', e);
    }
  }, 100);

  // Concurrent writes
  for (let i = 0; i < 20; i++) {
    setTimeout(async () => {
      try {
        const schema = {
          id: `load-test-${i}`,
          name: `Load Test ${i}`,
          fields: [],
        };
        await fetch('/api/schemas/storage?action=save&owner=test&repo=test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schema }),
        });
        console.log(`Created schema ${i}`);
      } catch (e) {
        console.error(`Write error ${i}:`, e);
      }
    }, i * 50);
  }

  // Stop after 5 seconds
  setTimeout(() => {
    stop = true;
    clearInterval(readInterval);
  }, 5000);
}
```

---

## Network Failure Recovery

### Scenario 5: Progressive Network Degradation

**Objective**: Test system behavior under deteriorating network conditions.

**Test Steps**:

1. Start with normal network conditions
2. Gradually introduce latency (Chrome DevTools: 500ms, 1s, 3s)
3. Simulate intermittent failures (50% packet loss)
4. Test complete network disconnection
5. Test network recovery

**Expected Behavior**:

- Stale data served during network issues
- Loading states shown appropriately
- Automatic retry mechanisms work
- Graceful degradation without crashes

**Test Procedure**:

```markdown
1. Chrome DevTools → Network → Throttling
2. Set custom throttling:
   - Download: 50kb/s
   - Upload: 20kb/s
   - Latency: 2000ms
3. Navigate between pages and observe behavior
4. Set to "Offline" and test offline handling
5. Return to "No throttling" and verify recovery
```

### Scenario 6: API Endpoint Failures

**Objective**: Test handling of specific API endpoint failures.

**Test Steps**:

1. Mock 500 errors for schema endpoints
2. Mock 404 errors for content endpoints
3. Mock timeout errors
4. Test partial API availability

**Mock Implementation**:

```typescript
// Add to your test environment
const originalFetch = window.fetch;
window.fetch = async (url, options) => {
  if (typeof url === 'string') {
    // Simulate schema endpoint failures
    if (url.includes('/api/schemas') && Math.random() < 0.3) {
      throw new Error('Simulated network error');
    }

    // Simulate content endpoint 500 errors
    if (url.includes('/api/content') && Math.random() < 0.2) {
      return new Response('Internal Server Error', { status: 500 });
    }

    // Simulate random timeouts
    if (Math.random() < 0.1) {
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  return originalFetch(url, options);
};
```

---

## Memory Management Edge Cases

### Scenario 7: Cache Size Explosion

**Objective**: Test system behavior with extremely large cache sizes.

**Test Steps**:

1. Generate 1000+ schemas with large field definitions
2. Create 10000+ content items
3. Navigate between all pages multiple times
4. Monitor memory usage and performance
5. Test cache cleanup mechanisms

**Test Code**:

```typescript
async function memoryStressTest() {
  console.log('Starting memory stress test...');

  // Create large schemas
  for (let i = 0; i < 1000; i++) {
    const largeSchema = {
      id: `large-schema-${i}`,
      name: `Large Schema ${i}`,
      description: 'A'.repeat(1000), // Large description
      fields: Array.from({ length: 50 }, (_, j) => ({
        id: `field-${j}`,
        type: 'text',
        label: `Field ${j}`,
        description: 'B'.repeat(500),
        validation: {
          required: true,
          pattern: 'C'.repeat(100),
        },
      })),
    };

    await fetch('/api/schemas/storage?action=save&owner=test&repo=test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema: largeSchema }),
    });

    if (i % 100 === 0) {
      console.log(
        `Created ${i} schemas, Memory:`,
        performance.memory?.usedJSHeapSize
      );
    }
  }
}
```

### Scenario 8: Rapid Cache Churn

**Objective**: Test cache performance with rapid creation/deletion cycles.

**Test Steps**:

1. Rapidly create and delete cache entries
2. Monitor memory growth patterns
3. Test garbage collection effectiveness
4. Verify no memory leaks

**Test Code**:

```typescript
async function cacheChurnTest() {
  for (let cycle = 0; cycle < 100; cycle++) {
    // Create 50 entries
    for (let i = 0; i < 50; i++) {
      const key = `churn-test-${cycle}-${i}`;
      if (window.gitcmsCache) {
        window.gitcmsCache.set(key, {
          data: `large data string: ${'x'.repeat(10000)}`,
          timestamp: Date.now(),
          key,
          ttl: 1000,
        });
      }
    }

    // Delete all entries
    if (window.gitcmsCache) {
      for (let i = 0; i < 50; i++) {
        window.gitcmsCache.delete(`churn-test-${cycle}-${i}`);
      }
    }

    if (cycle % 10 === 0) {
      console.log(
        `Cycle ${cycle}, Memory:`,
        performance.memory?.usedJSHeapSize
      );
      // Force garbage collection if available
      if (window.gc) window.gc();
    }
  }
}
```

---

## Race Condition Testing

### Scenario 9: Rapid Page Navigation

**Objective**: Test for race conditions during rapid navigation.

**Test Steps**:

1. Set up auto-navigation between schemas and content pages
2. Trigger mutations during navigation
3. Test component mounting/unmounting with pending requests
4. Verify no orphaned requests or state corruption

**Test Code**:

```typescript
async function rapidNavigationTest() {
  const pages = [
    '/schemas?owner=test&repo=test',
    '/content?owner=test&repo=test',
    '/content?owner=test&repo=test&schemaId=blog-post',
    '/schemas?owner=test&repo=test',
  ];

  for (let i = 0; i < 100; i++) {
    const randomPage = pages[Math.floor(Math.random() * pages.length)];
    window.location.href = randomPage;

    // Trigger random mutations during navigation
    if (Math.random() < 0.3) {
      setTimeout(async () => {
        try {
          await fetch('/api/schemas/storage?action=save&owner=test&repo=test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              schema: {
                id: `nav-test-${i}`,
                name: `Navigation Test ${i}`,
                fields: [],
              },
            }),
          });
        } catch (e) {
          // Expected - some requests may be cancelled
        }
      }, 50);
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }
}
```

### Scenario 10: Concurrent Mutation Conflicts

**Objective**: Test handling of conflicting simultaneous mutations.

**Test Steps**:

1. Attempt to modify the same schema from multiple sources
2. Test delete operations during update operations
3. Verify data consistency after conflicts
4. Test optimistic updates with conflicts

**Test Code**:

```typescript
async function concurrentMutationTest() {
  const schemaId = 'conflict-test-schema';

  // Create base schema
  await fetch('/api/schemas/storage?action=save&owner=test&repo=test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schema: {
        id: schemaId,
        name: 'Conflict Test',
        fields: [],
      },
    }),
  });

  // Concurrent modifications
  const promises = [
    // Update 1
    fetch('/api/schemas/storage?action=save&owner=test&repo=test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schema: {
          id: schemaId,
          name: 'Modified Version 1',
          fields: [{ id: 'field1', type: 'text' }],
        },
      }),
    }),

    // Update 2
    fetch('/api/schemas/storage?action=save&owner=test&repo=test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schema: {
          id: schemaId,
          name: 'Modified Version 2',
          fields: [{ id: 'field2', type: 'number' }],
        },
      }),
    }),

    // Delete attempt
    fetch(`/api/schemas/storage?owner=test&repo=test&schemaId=${schemaId}`, {
      method: 'DELETE',
    }),
  ];

  const results = await Promise.allSettled(promises);
  console.log('Conflict test results:', results);
}
```

---

## TTL Boundary Testing

### Scenario 11: TTL Expiration Edge Cases

**Objective**: Test cache behavior at TTL boundaries.

**Test Steps**:

1. Set very short TTL values (1 second)
2. Test cache behavior just before/after expiration
3. Test clock changes and time manipulation
4. Verify stale-while-revalidate behavior

**Test Code**:

```typescript
async function ttlBoundaryTest() {
  // Mock short TTL for testing
  const originalTTL = window.gitcmsCache?.DEFAULT_TTL;
  if (window.gitcmsCache) {
    window.gitcmsCache.DEFAULT_TTL = {
      CONTENT_LIST: 1000, // 1 second
      REPO_SCHEMAS: 1000,
      CONTENT_ITEM: 1000,
    };
  }

  // Load data
  await fetch('/api/schemas/storage?action=list&owner=test&repo=test');
  console.log('Data loaded at:', new Date().toISOString());

  // Wait for near-expiration
  setTimeout(() => {
    console.log('Near expiration, requesting data...');
    fetch('/api/schemas/storage?action=list&owner=test&repo=test');
  }, 900);

  // Wait for post-expiration
  setTimeout(() => {
    console.log('Post expiration, requesting data...');
    fetch('/api/schemas/storage?action=list&owner=test&repo=test');
  }, 1100);

  // Restore original TTL
  setTimeout(() => {
    if (window.gitcmsCache && originalTTL) {
      window.gitcmsCache.DEFAULT_TTL = originalTTL;
    }
  }, 2000);
}
```

### Scenario 12: System Clock Changes

**Objective**: Test cache behavior with system clock manipulation.

**Test Steps**:

1. Load data with normal timestamps
2. Simulate clock going backwards
3. Simulate clock jumping forward
4. Test timezone changes
5. Verify cache remains functional

**Test Code**:

```typescript
// Note: This test requires manual system clock changes
async function clockChangeTest() {
  // Load initial data
  await fetch('/api/schemas/storage?action=list&owner=test&repo=test');
  const initialTime = Date.now();

  console.log('Initial load complete. Please:');
  console.log('1. Change system clock backwards by 10 minutes');
  console.log('2. Press Enter in console');

  await new Promise(resolve => {
    const input = prompt('Press OK after changing clock backwards');
    resolve(input);
  });

  // Test cache behavior with backwards clock
  await fetch('/api/schemas/storage?action=list&owner=test&repo=test');
  console.log('Backwards clock test complete');

  console.log('3. Change system clock forwards by 1 hour');
  console.log('4. Press Enter in console');

  await new Promise(resolve => {
    const input = prompt('Press OK after changing clock forwards');
    resolve(input);
  });

  // Test cache behavior with forwards clock
  await fetch('/api/schemas/storage?action=list&owner=test&repo=test');
  console.log('Forwards clock test complete');
}
```

---

## Repository Switch Scenarios

### Scenario 13: Rapid Repository Switching

**Objective**: Test cache isolation during rapid repository changes.

**Test Steps**:

1. Load data for Repository A
2. Quickly switch to Repository B
3. Switch back to Repository A
4. Repeat rapidly 50 times
5. Verify no data leakage between repositories

**Test Code**:

```typescript
async function rapidRepoSwitchTest() {
  const repos = [
    { owner: 'user1', repo: 'repo1' },
    { owner: 'user2', repo: 'repo2' },
    { owner: 'user3', repo: 'repo3' },
  ];

  for (let i = 0; i < 50; i++) {
    const randomRepo = repos[Math.floor(Math.random() * repos.length)];

    // Navigate to repository
    const url = `/schemas?owner=${randomRepo.owner}&repo=${randomRepo.repo}`;
    window.history.pushState({}, '', url);

    // Trigger data load
    await fetch(
      `/api/schemas/storage?action=list&owner=${randomRepo.owner}&repo=${randomRepo.repo}`
    );

    console.log(`Switch ${i}: ${randomRepo.owner}/${randomRepo.repo}`);

    // Quick switch
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
```

### Scenario 14: Invalid Repository Data

**Objective**: Test handling of malformed or invalid repository configurations.

**Test Steps**:

1. Test with non-existent repositories
2. Test with invalid repository names
3. Test with repositories without permissions
4. Test with corrupted localStorage data

**Test Code**:

```typescript
async function invalidRepoTest() {
  const invalidRepos = [
    { owner: '', repo: '' },
    { owner: 'nonexistent', repo: 'fakerepo' },
    { owner: 'user with spaces', repo: 'invalid/name' },
    { owner: null, repo: undefined },
    { owner: '../../etc/passwd', repo: '../../../root' },
  ];

  for (const invalidRepo of invalidRepos) {
    try {
      const url = `/schemas?owner=${invalidRepo.owner}&repo=${invalidRepo.repo}`;
      window.history.pushState({}, '', url);

      const response = await fetch(
        `/api/schemas/storage?action=list&owner=${invalidRepo.owner}&repo=${invalidRepo.repo}`
      );
      console.log(
        `Invalid repo test: ${invalidRepo.owner}/${invalidRepo.repo} - Status: ${response.status}`
      );
    } catch (error) {
      console.log(
        `Invalid repo test: ${invalidRepo.owner}/${invalidRepo.repo} - Error: ${error.message}`
      );
    }
  }
}
```

---

## Bulk Operations Testing

### Scenario 15: Mass Schema Import

**Objective**: Test system behavior during large-scale import operations.

**Test Steps**:

1. Import 500+ schemas simultaneously
2. Monitor cache behavior during import
3. Test UI responsiveness during bulk operations
4. Verify final state consistency

**Test Code**:

```typescript
async function massImportTest() {
  const schemas = Array.from({ length: 500 }, (_, i) => ({
    id: `bulk-import-${i}`,
    name: `Bulk Import Schema ${i}`,
    description: `Generated schema ${i} for bulk testing`,
    fields: Array.from({ length: 10 }, (_, j) => ({
      id: `field-${j}`,
      type: 'text',
      label: `Field ${j}`,
      required: j % 2 === 0,
    })),
  }));

  console.log('Starting mass import of 500 schemas...');
  const startTime = performance.now();

  // Import in batches to avoid overwhelming the system
  const batchSize = 10;
  for (let i = 0; i < schemas.length; i += batchSize) {
    const batch = schemas.slice(i, i + batchSize);

    const promises = batch.map(schema =>
      fetch('/api/schemas/storage?action=save&owner=test&repo=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema }),
      })
    );

    await Promise.all(promises);

    console.log(
      `Imported batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(schemas.length / batchSize)}`
    );

    // Small delay to prevent overwhelming
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const endTime = performance.now();
  console.log(`Mass import completed in ${endTime - startTime}ms`);
}
```

### Scenario 16: Bulk Content Operations

**Objective**: Test bulk content creation, update, and deletion.

**Test Steps**:

1. Create 1000+ content items rapidly
2. Update all items with new data
3. Delete items in random order
4. Monitor cache invalidation performance

**Test Code**:

```typescript
async function bulkContentTest() {
  const schemaId = 'blog-post';
  const contentCount = 1000;

  console.log(`Creating ${contentCount} content items...`);

  // Bulk creation
  for (let i = 0; i < contentCount; i++) {
    const content = {
      id: `bulk-content-${i}`,
      title: `Bulk Content ${i}`,
      body: `This is bulk generated content item number ${i}. `.repeat(50),
      status: i % 3 === 0 ? 'published' : 'draft',
    };

    try {
      await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          owner: 'test',
          repo: 'test',
          schemaId,
          data: content,
        }),
      });

      if (i % 100 === 0) {
        console.log(`Created ${i} content items`);
      }
    } catch (error) {
      console.error(`Error creating content ${i}:`, error);
    }
  }

  console.log('Bulk content creation completed');
}
```

---

## Performance Degradation Scenarios

### Scenario 17: Memory Pressure Testing

**Objective**: Test system behavior under severe memory constraints.

**Test Steps**:

1. Create memory pressure with large objects
2. Test cache pruning mechanisms
3. Monitor garbage collection behavior
4. Verify graceful degradation

**Test Code**:

```typescript
async function memoryPressureTest() {
  // Create memory pressure
  const memoryHogs = [];

  try {
    for (let i = 0; i < 1000; i++) {
      // Create large objects to consume memory
      memoryHogs.push(new Array(1000000).fill(`memory-pressure-${i}`));

      // Test cache operations under pressure
      if (i % 100 === 0) {
        await fetch('/api/schemas/storage?action=list&owner=test&repo=test');
        console.log(
          `Memory pressure test iteration ${i}, Heap: ${performance.memory?.usedJSHeapSize}`
        );
      }
    }
  } catch (error) {
    console.log('Memory pressure reached:', error.message);
  }

  // Clear memory pressure
  memoryHogs.length = 0;

  // Test recovery
  if (window.gc) window.gc();
  await fetch('/api/schemas/storage?action=list&owner=test&repo=test');
  console.log('Memory pressure test completed');
}
```

### Scenario 18: CPU Intensive Operations

**Objective**: Test cache performance during CPU-intensive operations.

**Test Steps**:

1. Start CPU-intensive background tasks
2. Perform cache operations during high CPU usage
3. Test UI responsiveness
4. Verify cache consistency

**Test Code**:

```typescript
async function cpuIntensiveTest() {
  let stop = false;

  // CPU intensive background task
  const cpuTask = () => {
    const start = performance.now();
    while (performance.now() - start < 50 && !stop) {
      // Intensive computation
      Math.random() * Math.random() * Math.random();
    }
    if (!stop) setTimeout(cpuTask, 1);
  };

  cpuTask();

  // Test cache operations during CPU load
  for (let i = 0; i < 100; i++) {
    const start = performance.now();

    await fetch('/api/schemas/storage?action=list&owner=test&repo=test');

    const duration = performance.now() - start;
    console.log(`Request ${i} completed in ${duration}ms`);

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  stop = true;
  console.log('CPU intensive test completed');
}
```

---

## Test Automation Scripts

### Automated Test Suite

```typescript
class CriticalTestSuite {
  private results: { test: string; passed: boolean; error?: string }[] = [];

  async runAllTests() {
    console.log('🚀 Starting Critical Test Suite');

    const tests = [
      this.testCacheInvalidation,
      this.testConcurrentRequests,
      this.testNetworkFailures,
      this.testMemoryManagement,
      this.testRaceConditions,
      this.testTTLBoundaries,
      this.testRepositorySwitching,
      this.testBulkOperations,
      this.testPerformanceDegradation,
    ];

    for (const test of tests) {
      try {
        await test.call(this);
        this.results.push({ test: test.name, passed: true });
        console.log(`✅ ${test.name} passed`);
      } catch (error) {
        this.results.push({
          test: test.name,
          passed: false,
          error: error.message,
        });
        console.log(`❌ ${test.name} failed:`, error.message);
      }
    }

    this.generateReport();
  }

  private async testCacheInvalidation() {
    // Run abbreviated version of cache invalidation tests
    await this.rapidMutations();
    await this.crossRepoIsolation();
  }

  private async testConcurrentRequests() {
    // Run thundering herd and mixed load tests
    await this.thunderingHerdProtection();
    await this.mixedRequestTypes();
  }

  // ... implement other test methods

  private generateReport() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;

    console.log('\n📊 Test Results Summary');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    const failed = this.results.filter(r => !r.passed);
    if (failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      failed.forEach(test => {
        console.log(`  - ${test.test}: ${test.error}`);
      });
    }
  }
}

// Run the test suite
const testSuite = new CriticalTestSuite();
testSuite.runAllTests();
```

---

## Monitoring and Metrics

### Performance Monitoring Setup

```typescript
class PerformanceMonitor {
  private metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    requestDuration: [],
    memoryUsage: [],
    errorCount: 0,
  };

  startMonitoring() {
    // Override fetch to monitor requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;

        this.metrics.requestDuration.push(duration);

        if (response.ok) {
          this.metrics.cacheHits++;
        } else {
          this.metrics.cacheMisses++;
        }

        return response;
      } catch (error) {
        this.metrics.errorCount++;
        throw error;
      }
    };

    // Monitor memory usage
    setInterval(() => {
      if (performance.memory) {
        this.metrics.memoryUsage.push(performance.memory.usedJSHeapSize);
      }
    }, 5000);
  }

  getReport() {
    const avgDuration =
      this.metrics.requestDuration.reduce((a, b) => a + b, 0) /
      this.metrics.requestDuration.length;
    const maxMemory = Math.max(...this.metrics.memoryUsage);

    return {
      cacheHitRate:
        this.metrics.cacheHits /
        (this.metrics.cacheHits + this.metrics.cacheMisses),
      averageRequestDuration: avgDuration,
      maxMemoryUsage: maxMemory,
      errorRate:
        this.metrics.errorCount /
        (this.metrics.cacheHits +
          this.metrics.cacheMisses +
          this.metrics.errorCount),
    };
  }
}
```

---

## Conclusion

These critical testing scenarios provide comprehensive coverage of edge cases
and stress conditions that could affect the enhanced API request management
system in production environments. Regular execution of these tests ensures:

1. **System Robustness**: Handles extreme conditions gracefully
2. **Data Integrity**: Maintains consistency under all circumstances
3. **Performance Stability**: Performs well under stress
4. **Memory Safety**: No memory leaks or excessive consumption
5. **Network Resilience**: Recovers from network issues
6. **User Experience**: Maintains responsiveness under load

### Testing Schedule Recommendation

- **Daily**: Automated test suite (abbreviated versions)
- **Weekly**: Full critical scenario testing
- **Before Releases**: Complete test suite with manual verification
- **After Incidents**: Targeted testing of affected scenarios

### Reporting Issues

When tests fail, capture:

- Browser console logs
- Performance timeline
- Memory usage graphs
- Network request details
- Cache state snapshots

This comprehensive testing approach ensures the enhanced API request management
system remains reliable and performant in all production scenarios.
