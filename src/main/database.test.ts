import { describe, it, expect, vi } from 'vitest';
import { getDatabase, initDatabase } from './database';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => __dirname) // Use current dir for testing
  }
}));

describe('Database Module', () => {
  it('should initialize successfully', () => {
    initDatabase();
    const db = getDatabase();
    expect(db).toBeDefined();
    
    // Cleanup the sqlite file created during test
    try {
      const dbPath = path.join(__dirname, 'wamanage.sqlite');
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    } catch(e) {}
  });
});
