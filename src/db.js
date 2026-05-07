const DB_NAME = 'DocSachDB'
const DB_VER  = 2

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER)
    req.onupgradeneeded = e => {
      const db = e.target.result
      const oldVersion = e.oldVersion

      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('books'))
          db.createObjectStore('books', { keyPath: 'id', autoIncrement: true })
        if (!db.objectStoreNames.contains('progress'))
          db.createObjectStore('progress', { keyPath: 'bookId' })
        if (!db.objectStoreNames.contains('settings'))
          db.createObjectStore('settings', { keyPath: 'key' })
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('categories'))
          db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = e => {
      const db = e.target.result
      // Migration thêm field mới cho books cũ (v2)
      if (db.objectStoreNames.contains('books')) {
        const tx = db.transaction('books', 'readwrite')
        const store = tx.objectStore('books')
        const cursorReq = store.openCursor()
        cursorReq.onsuccess = (ev) => {
          const cursor = ev.target.result
          if (cursor) {
            const book = cursor.value
            let updated = false
            if (book.categoryIds === undefined) { book.categoryIds = []; updated = true }
            if (book.favorite === undefined) { book.favorite = false; updated = true }
            if (updated) cursor.update(book)
            cursor.continue()
          }
        }
        tx.oncomplete = () => res(db)
        tx.onerror = () => res(db) // vẫn resolve dù có lỗi nhỏ
      } else {
        res(db)
      }
    }
    req.onerror = e => rej(e.target.error)
  })
}

async function dbGet(store, key) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store).objectStore(store).get(key)
    req.onsuccess = e => res(e.target.result)
    req.onerror   = e => rej(e.target.error)
  })
}

async function dbGetAll(store) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store).objectStore(store).getAll()
    req.onsuccess = e => res(e.target.result)
    req.onerror   = e => rej(e.target.error)
  })
}

async function dbPut(store, value) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).put(value)
    req.onsuccess = e => res(e.target.result)
    req.onerror   = e => rej(e.target.error)
  })
}

async function dbDelete(store, key) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key)
    req.onsuccess = e => res(e.target.result)
    req.onerror   = e => rej(e.target.error)
  })
}

async function dbUpdateBook(id, fields) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction('books', 'readwrite')
    const store = tx.objectStore('books')
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const book = getReq.result
      if (!book) return rej(new Error('Book not found'))
      Object.assign(book, fields)
      store.put(book).onsuccess = e => res(e.target.result)
    }
    getReq.onerror = () => rej(getReq.error)
  })
}

async function removeCategoryFromAllBooks(catId) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction('books', 'readwrite')
    const store = tx.objectStore('books')
    const cursorReq = store.openCursor()
    cursorReq.onsuccess = (ev) => {
      const cursor = ev.target.result
      if (cursor) {
        const book = cursor.value
        if (book.categoryIds && book.categoryIds.includes(catId)) {
          book.categoryIds = book.categoryIds.filter(id => id !== catId)
          cursor.update(book)
        }
        cursor.continue()
      }
    }
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
}

// Backup & Restore
async function exportData() {
  try {
    const books = await dbGetAll('books')
    const progress = await dbGetAll('progress')
    const settings = await dbGetAll('settings')
    const categories = await dbGetAll('categories')

    const backup = {
      timestamp: new Date().toISOString(),
      version: 2,
      books: books.map(b => ({
        id: b.id,
        name: b.name,
        ext: b.ext,
        cover: b.cover,
        author: b.author,
        createdAt: b.createdAt,
        categoryIds: b.categoryIds || [],
        favorite: b.favorite || false
      })),
      progress,
      settings,
      categories
    }

    const json = JSON.stringify(backup, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `doc-sach-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return { status: 'success', message: 'Backup OK - Nhớ re-upload sách khi restore' }
  } catch (err) {
    console.error('Export error:', err)
    return { status: 'error', message: 'Error: ' + err.message }
  }
}

async function importData(file) {
  try {
    const text = await file.text()
    const backup = JSON.parse(text)

    if (!backup.books || !backup.progress || !backup.settings) {
      throw new Error('File không hợp lệ')
    }

    const db = await openDB()
    const stores = ['books', 'progress', 'settings']
    if (backup.version >= 2 && backup.categories) stores.push('categories')

    const tx = db.transaction(stores, 'readwrite')

    tx.objectStore('books').clear()
    tx.objectStore('progress').clear()
    tx.objectStore('settings').clear()

    backup.books.forEach(b => tx.objectStore('books').put({
      ...b,
      categoryIds: b.categoryIds || [],
      favorite: b.favorite || false,
      buf: null
    }))
    backup.progress.forEach(p => tx.objectStore('progress').put(p))
    backup.settings.forEach(s => tx.objectStore('settings').put(s))

    if (backup.categories) {
      if (tx.objectStore('categories')) {
        tx.objectStore('categories').clear()
        backup.categories.forEach(c => tx.objectStore('categories').put(c))
      }
    }

    await new Promise((res, rej) => {
      tx.onsuccess = res
      tx.onerror = rej
    })

    return { status: 'success', message: 'Restore OK - Vui lòng re-upload sách' }
  } catch (err) {
    console.error('Import error:', err)
    return { status: 'error', message: 'Error: ' + err.message }
  }
}

export {
  openDB, dbGet, dbGetAll, dbPut, dbDelete,
  dbUpdateBook, removeCategoryFromAllBooks,
  exportData, importData
}
