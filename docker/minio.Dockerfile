# MinIO Dockerfile for AgroMart Production
# Based on official MinIO image with custom configuration

FROM minio/minio:latest

# Add labels for better image management
LABEL org.opencontainers.image.source="https://github.com/${GITHUB_USERNAME}/agromart"
LABEL org.opencontainers.image.description="AgroMart MinIO Object Storage"
LABEL org.opencontainers.image.licenses="MIT"

# Create directory for MinIO data
RUN mkdir -p /data

# Set default environment variables
ENV MINIO_ROOT_USER=minioadmin
ENV MINIO_ROOT_PASSWORD=minioadmin

# Expose MinIO ports
EXPOSE 9000 9001

# Health check
HEALTHCHECK --interval=30s --timeout=20s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:9000/minio/health/live || exit 1

# Use the default MinIO entrypoint
CMD ["server", "/data", "--console-address", ":9001"]