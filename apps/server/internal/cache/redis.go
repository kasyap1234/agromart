package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisCache implements caching with Redis backend
type RedisCache struct {
	client *redis.Client
	ttl    time.Duration
}

// NewRedisCache creates a new Redis cache instance
func NewRedisCache(cfg CacheConfig) (*RedisCache, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	log.Printf("[CACHE] Connected to Redis at %s:%d", cfg.Host, cfg.Port)

	return &RedisCache{
		client: rdb,
		ttl:    cfg.TTL,
	}, nil
}

// Set stores a value in cache with default TTL
func (r *RedisCache) Set(ctx context.Context, key string, value interface{}) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}

	return r.client.Set(ctx, key, data, r.ttl).Err()
}

// SetWithTTL stores a value in cache with custom TTL
func (r *RedisCache) SetWithTTL(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}

	return r.client.Set(ctx, key, data, ttl).Err()
}

// Get retrieves a value from cache
func (r *RedisCache) Get(ctx context.Context, key string, dest interface{}) error {
	data, err := r.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return fmt.Errorf("key not found: %s", key)
		}
		return fmt.Errorf("failed to get value: %w", err)
	}

	return json.Unmarshal([]byte(data), dest)
}

// Delete removes a key from cache
func (r *RedisCache) Delete(ctx context.Context, key string) error {
	return r.client.Del(ctx, key).Err()
}

// Exists checks if a key exists in cache
func (r *RedisCache) Exists(ctx context.Context, key string) bool {
	count, err := r.client.Exists(ctx, key).Result()
	return err == nil && count > 0
}

// FlushAll clears all cache entries
func (r *RedisCache) FlushAll(ctx context.Context) error {
	return r.client.FlushAll(ctx).Err()
}

// Close closes the Redis connection
func (r *RedisCache) Close() error {
	return r.client.Close()
}

// Wrapper methods to match expected interface

// SetProduct stores a product with appropriate TTL
func (r *RedisCache) SetProduct(ctx context.Context, key string, product interface{}) error {
	return r.SetWithTTL(ctx, key, product, 30*time.Minute)
}

// SetInventory stores inventory with shorter TTL
func (r *RedisCache) SetInventory(ctx context.Context, key string, inventory interface{}) error {
	return r.SetWithTTL(ctx, key, inventory, 15*time.Minute)
}

// SetAnalytics stores analytics data with longer TTL
func (r *RedisCache) SetAnalytics(ctx context.Context, key string, data interface{}) error {
	return r.SetWithTTL(ctx, key, data, 1*time.Hour)
}

// SetSession stores session data with very long TTL
func (r *RedisCache) SetSession(ctx context.Context, key string, session interface{}) error {
	return r.SetWithTTL(ctx, key, session, 24*time.Hour)
}

// WarmupCache preloads critical data into cache
func (r *RedisCache) WarmupCache(ctx context.Context, data map[string]interface{}) error {
	for key, value := range data {
		if err := r.Set(ctx, key, value); err != nil {
			return err
		}
	}
	return nil
}

// InvalidateProductCache removes product-related cache entries
func (r *RedisCache) InvalidateProductCache(ctx context.Context, productID string) error {
	keys := []string{
		fmt.Sprintf("product:%s", productID),
		fmt.Sprintf("inventory:%s", productID),
	}
	for _, key := range keys {
		if err := r.Delete(ctx, key); err != nil {
			// Log but don't fail the entire operation
			log.Printf("Failed to delete cache key %s: %v", key, err)
		}
	}
	return nil
}

// GetStats returns cache statistics
func (r *RedisCache) GetStats(ctx context.Context) (map[string]interface{}, error) {
	info, err := r.client.Info(ctx).Result()
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"info": info,
		"ttl":  r.ttl.String(),
	}, nil
}