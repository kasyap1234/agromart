package cache

import (
	"sync"
	"time"
)

// MemoryCache implements in-memory LRU cache
type MemoryCache struct {
	cache map[string]cacheItem
	mutex sync.RWMutex
	cleanupInterval time.Duration
}

type cacheItem struct {
	value      interface{}
	expiration time.Time
}

// NewMemoryCache creates a new in-memory cache
func NewMemoryCache(capacity int) *MemoryCache {
	cache := &MemoryCache{
		cache:           make(map[string]cacheItem),
		cleanupInterval: 10 * time.Minute,
	}

	// Start cleanup goroutine
	go cache.cleanup()
	return cache
}

// Set stores a value in cache with expiration
func (m *MemoryCache) Set(key string, value interface{}, expiration time.Duration) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.cache[key] = cacheItem{
		value:      value,
		expiration: time.Now().Add(expiration),
	}
	return nil
}

// Get retrieves a value from cache
func (m *MemoryCache) Get(key string, dest interface{}) error {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	item, exists := m.cache[key]
	if !exists || time.Now().After(item.expiration) {
		// Clean up expired item
		if exists {
			delete(m.cache, key)
		}
		return nil // Return nil for cache miss, not error
	}

	// Type assertion to copy the value
	if destPtr, ok := dest.(*interface{}); ok {
		*destPtr = item.value
	}
	return nil
}

// Delete removes a key from cache
func (m *MemoryCache) Delete(key string) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	delete(m.cache, key)
	return nil
}

// Exists checks if a key exists in cache
func (m *MemoryCache) Exists(key string) bool {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	item, exists := m.cache[key]
	if !exists || time.Now().After(item.expiration) {
		return false
	}
	return true
}

// FlushAll clears all cache entries
func (m *MemoryCache) FlushAll() error {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.cache = make(map[string]cacheItem)
	return nil
}

// Stats returns cache statistics
func (m *MemoryCache) Stats() map[string]interface{} {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	return map[string]interface{}{
		"items":      len(m.cache),
		"type":       "Memory",
		"available":  true,
	}
}

// StartCleanup starts the cleanup goroutine for expired items
func (m *MemoryCache) StartCleanup(interval time.Duration) {
	m.cleanupInterval = interval
}

// cleanup removes expired items
func (m *MemoryCache) cleanup() {
	ticker := time.NewTicker(m.cleanupInterval)
	defer ticker.Stop()

	for range ticker.C {
		m.mutex.Lock()
		now := time.Now()
		for key, item := range m.cache {
			if now.After(item.expiration) {
				delete(m.cache, key)
			}
		}
		m.mutex.Unlock()
	}
}