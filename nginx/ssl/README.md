# SSL Certificates

This directory is used to store SSL certificates for the Nginx server.

## Adding SSL Certificates

To enable HTTPS, you need to add your SSL certificates to this directory:

1. `cert.pem` - Your SSL certificate
2. `key.pem` - Your private key

## Generating Self-Signed Certificates (For Development)

For development purposes, you can generate self-signed certificates using OpenSSL:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem
```

## Using Let's Encrypt (For Production)

For production environments, it's recommended to use Let's Encrypt certificates:

1. Install Certbot
2. Generate certificates:
   ```bash
   certbot certonly --standalone -d your-domain.com
   ```
3. Copy the certificates to this directory:
   ```bash
   cp /etc/letsencrypt/live/your-domain.com/fullchain.pem cert.pem
   cp /etc/letsencrypt/live/your-domain.com/privkey.pem key.pem
   ```

## Security Notes

- Never commit private keys to version control
- Ensure proper file permissions (600 for private keys)
- Regularly renew certificates before they expire