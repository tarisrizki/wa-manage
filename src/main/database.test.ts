import { describe, it, expect, vi } from 'vitest';
import { getDatabase, initDatabase } from './database';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

import * as os from 'os';

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => os.tmpdir()) // Use temp dir for testing
  }
}));

describe('Database Module', () => {
  it('should initialize successfully', () => {
    initDatabase();
    const db = getDatabase();
    expect(db).toBeDefined();
    
    // Cleanup the sqlite files created during test
    try {
      const dbPath = path.join(os.tmpdir(), 'wamanage.sqlite');
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
      if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
    } catch(e) {}
  });
});
