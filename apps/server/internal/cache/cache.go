package cache

import (
	"context"
	"fmt"
	"time"
)

// Cache defines the interface for caching operations
type Cache interface {
	Set(key string, value interface{}, expiration time.Duration) error
	Get(key string, dest interface{}) error
	Delete(key string) error
	Exists(key string) bool
	FlushAll() error
}

// CacheConfig holds Redis cache configuration
type CacheConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
	TTL      time.Duration
}

// HybridCache combines Redis with in-memory LRU cache as fallback
type HybridCache struct {
	redis  *RedisCache
	memory *MemoryCache
}

// NewHybridCache creates a new hybrid cache with Redis as primary and memory as fallback
func NewHybridCache(redisConfig CacheConfig, memoryCapacity int) (*HybridCache, error) {
	redisCache, err := NewRedisCache(redisConfig)
	if err != nil {
		// If Redis fails, fall back to memory cache
		return &HybridCache{
			redis:  nil,
			memory: NewMemoryCache(memoryCapacity),
		}, nil
	}

	memoryCache := NewMemoryCache(memoryCapacity)
	// Start cleanup for memory cache
	memoryCache.StartCleanup(10 * time.Minute)

	return &HybridCache{
		redis:  redisCache,
		memory: memoryCache,
	}, nil
}

func (h *HybridCache) Set(key string, value interface{}, expiration time.Duration) error {
	// Try Redis first
	if h.redis != nil {
		ctx := context.Background()
		if err := h.redis.Set(ctx, key, value); err == nil {
			return nil
		}
	}

	// Fall back to memory cache
	return h.memory.Set(key, value, expiration)
}

func (h *HybridCache) Get(key string, dest interface{}) error {
	// Try Redis first
	if h.redis != nil {
		ctx := context.Background()
		if err := h.redis.Get(ctx, key, dest); err == nil {
			return nil
		}
	}

	// Fall back to memory cache
	return h.memory.Get(key, dest)
}

func (h *HybridCache) Delete(key string) error {
	var redisErr, memoryErr error

	// Delete from both caches
	if h.redis != nil {
		ctx := context.Background()
		redisErr = h.redis.Delete(ctx, key)
	}
	memoryErr = h.memory.Delete(key)

	// Return the first error encountered
	if redisErr != nil {
		return redisErr
	}
	return memoryErr
}

func (h *HybridCache) Exists(key string) bool {
	// Check Redis first
	if h.redis != nil {
		ctx := context.Background()
		if h.redis.Exists(ctx, key) {
			return true
		}
	}

	// Check memory cache
	return h.memory.Exists(key)
}

func (h *HybridCache) FlushAll() error {
	var redisErr, memoryErr error

	// Flush both caches
	if h.redis != nil {
		ctx := context.Background()
		redisErr = h.redis.FlushAll(ctx)
	}
	memoryErr = h.memory.FlushAll()

	// Return the first error encountered
	if redisErr != nil {
		return redisErr
	}
	return memoryErr
}

// GetStats returns statistics about both caches
func (h *HybridCache) GetStats() map[string]interface{} {
	stats := make(map[string]interface{})

	if h.redis != nil {
		stats["redis"] = map[string]interface{}{
			"available": true,
			"type":      "Redis",
		}
	} else {
		stats["redis"] = map[string]interface{}{
			"available": false,
			"type":      "Redis",
			"error":     "Redis not available",
		}
	}

	stats["memory"] = h.memory.Stats()

	return stats
}

// Product-specific methods with optimized caching strategies
func (h *HybridCache) SetProduct(key string, product interface{}) error {
	// Products are cached longer in Redis, shorter in memory
	if h.redis != nil {
		ctx := context.Background()
		return h.redis.SetProduct(ctx, key, product)
	}
	return h.memory.Set(key, product, 30*time.Minute)
}

func (h *HybridCache) GetProduct(key string, dest interface{}) error {
	return h.Get(key, dest)
}

func (h *HybridCache) SetInventory(key string, inventory interface{}) error {
	// Inventory changes more frequently, shorter TTL
	if h.redis != nil {
		ctx := context.Background()
		return h.redis.SetInventory(ctx, key, inventory)
	}
	return h.memory.Set(key, inventory, 15*time.Minute)
}

func (h *HybridCache) GetInventory(key string, dest interface{}) error {
	return h.Get(key, dest)
}

func (h *HybridCache) SetAnalytics(key string, data interface{}) error {
	// Analytics data is expensive to compute, cache longer
	if h.redis != nil {
		ctx := context.Background()
		return h.redis.SetAnalytics(ctx, key, data)
	}
	return h.memory.Set(key, data, 1*time.Hour)
}

func (h *HybridCache) GetAnalytics(key string, dest interface{}) error {
	return h.Get(key, dest)
}

func (h *HybridCache) SetSession(key string, session interface{}) error {
	// Sessions need to be available, longer TTL
	if h.redis != nil {
		ctx := context.Background()
		return h.redis.SetSession(ctx, key, session)
	}
	return h.memory.Set(key, session, 24*time.Hour)
}

func (h *HybridCache) GetSession(key string, dest interface{}) error {
	return h.Get(key, dest)
}

// Cache warming for critical data
func (h *HybridCache) WarmupCache(data map[string]interface{}) error {
	if h.redis != nil {
		ctx := context.Background()
		return h.redis.WarmupCache(ctx, data)
	}

	// For memory cache, set with default expiration
	for key, value := range data {
		if err := h.memory.Set(key, value, 30*time.Minute); err != nil {
			return err
		}
	}
	return nil
}

// Cache invalidation
func (h *HybridCache) InvalidateProductCache(productID string) error {
	if h.redis != nil {
		ctx := context.Background()
		return h.redis.InvalidateProductCache(ctx, productID)
	}

	// For memory cache, delete specific keys
	keys := []string{
		fmt.Sprintf("product:%s", productID),
		fmt.Sprintf("inventory:%s", productID),
	}

	for _, key := range keys {
		h.memory.Delete(key)
	}

	return nil
}