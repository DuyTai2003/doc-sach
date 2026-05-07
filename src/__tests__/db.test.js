import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import 'fake-indexeddb/auto'
import { openDB, dbGet, dbGetAll, dbPut, dbDelete } from '../db.js'

describe('db.js - IndexedDB operations', () => {
  beforeAll(async () => {
    // Trigger DB creation
    await openDB()
  })

  it('dbPut: should store and return an id', async () => {
    const id = await dbPut('books', { name: 'Test Book', ext: 'epub' })
    expect(id).toBeGreaterThan(0)
  })

  it('dbGet: should retrieve stored data', async () => {
    const id = await dbPut('books', { name: 'Get Test', ext: 'pdf' })
    const result = await dbGet('books', id)
    expect(result).toBeTruthy()
    expect(result.name).toBe('Get Test')
    expect(result.ext).toBe('pdf')
  })

  it('dbGetAll: should return all items', async () => {
    const allBooks = await dbGetAll('books')
    expect(Array.isArray(allBooks)).toBe(true)
    expect(allBooks.length).toBeGreaterThanOrEqual(2)
  })

  it('dbDelete: should delete an item', async () => {
    const id = await dbPut('books', { name: 'Delete Me', ext: 'txt' })
    await dbDelete('books', id)
    const result = await dbGet('books', id)
    expect(result).toBeUndefined()
  })

  it('dbPut settings: should store and retrieve settings', async () => {
    await dbPut('settings', { key: 'ui', theme: 'sepia', lang: 'vi' })
    const s = await dbGet('settings', 'ui')
    expect(s).toBeTruthy()
    expect(s.theme).toBe('sepia')
    expect(s.lang).toBe('vi')
  })

  it('dbPut categories: should store and retrieve categories', async () => {
    const id = await dbPut('categories', { name: 'Khoa học', color: '#22c55e' })
    const cats = await dbGetAll('categories')
    expect(cats.some(c => c.name === 'Khoa học')).toBe(true)
  })
})
