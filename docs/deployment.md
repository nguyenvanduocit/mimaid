# Deployment Guide

## Overview

MinimalMermaid là một static web application có thể deploy trên nhiều platforms khác nhau. Tài liệu này hướng dẫn deploy trên các platforms phổ biến.

## Build Requirements

### Environment Variables
```env
VITE_GOOGLE_AI_API_KEY=your_gemini_api_key
VITE_LIVEBLOCKS_PUBLIC_API_KEY=pk_live_your_liveblocks_key
```

### Build Commands
```bash
# Install dependencies
bun install

# Build for production
bun run build

# Preview production build locally
bun run preview
```

## Vercel Deployment

### Quick Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add VITE_GOOGLE_AI_API_KEY
vercel env add VITE_LIVEBLOCKS_PUBLIC_API_KEY

# Redeploy with environment variables
vercel --prod
```

### `vercel.json` Configuration
```json
{
  "buildCommand": "bun run build",
  "outputDirectory": "dist",
  "installCommand": "bun install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### GitHub Integration
1. Connect GitHub repository tới Vercel
2. Set environment variables trong Vercel dashboard
3. Enable automatic deployments
4. Configure branch protection rules

## Netlify Deployment

### Drag & Drop Deploy
1. Build project locally: `bun run build`
2. Drag `dist` folder tới Netlify
3. Set environment variables trong site settings

### Git-based Deploy

#### `netlify.toml` Configuration
```toml
[build]
  command = "bun run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### CLI Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy

# Production deploy
netlify deploy --prod

# Set environment variables
netlify env:set VITE_GOOGLE_AI_API_KEY your_key
netlify env:set VITE_LIVEBLOCKS_PUBLIC_API_KEY your_key
```

## GitHub Pages Deployment

### GitHub Actions Workflow

#### `.github/workflows/deploy.yml`
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
        
    - name: Install dependencies
      run: bun install
      
    - name: Build
      run: bun run build
      env:
        VITE_GOOGLE_AI_API_KEY: ${{ secrets.VITE_GOOGLE_AI_API_KEY }}
        VITE_LIVEBLOCKS_PUBLIC_API_KEY: ${{ secrets.VITE_LIVEBLOCKS_PUBLIC_API_KEY }}
        
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### Manual GitHub Pages Setup
1. Enable GitHub Pages trong repository settings
2. Set source tới "Deploy from a branch"
3. Choose `gh-pages` branch
4. Add environment variables trong repository secrets

## Cloudflare Pages

### Git Integration
```bash
# Connect repository
# Set build command: bun run build
# Set build output directory: dist
# Set environment variables in dashboard
```

### `wrangler.toml` Configuration
```toml
name = "minimalmermaid"
compatibility_date = "2023-05-18"

[env.production]
account_id = "your-account-id"
zone_id = "your-zone-id"

[[env.production.routes]]
pattern = "yourdomain.com/*"
zone_id = "your-zone-id"
```

### CLI Deployment
```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy
wrangler pages publish dist
```

## AWS S3 + CloudFront

### S3 Bucket Setup
```bash
# Create S3 bucket
aws s3 mb s3://your-bucket-name

# Enable static website hosting
aws s3 website s3://your-bucket-name \
  --index-document index.html \
  --error-document index.html

# Upload build files
aws s3 sync dist/ s3://your-bucket-name --delete
```

### CloudFront Distribution
```json
{
  "DistributionConfig": {
    "CallerReference": "minimalmermaid-distribution",
    "DefaultRootObject": "index.html",
    "Origins": {
      "Quantity": 1,
      "Items": [
        {
          "Id": "S3-your-bucket-name",
          "DomainName": "your-bucket-name.s3.amazonaws.com",
          "S3OriginConfig": {
            "OriginAccessIdentity": ""
          }
        }
      ]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3-your-bucket-name",
      "ViewerProtocolPolicy": "redirect-to-https",
      "Compress": true,
      "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    },
    "CustomErrorResponses": {
      "Quantity": 1,
      "Items": [
        {
          "ErrorCode": 404,
          "ResponsePagePath": "/index.html",
          "ResponseCode": "200"
        }
      ]
    }
  }
}
```

## Docker Deployment

### `Dockerfile`
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install bun
RUN npm install -g bun

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build application
RUN bun run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### `nginx.conf`
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

        # Security headers
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### Docker Commands
```bash
# Build image
docker build -t minimalmermaid .

# Run container
docker run -p 80:80 minimalmermaid

# Docker Compose
docker-compose up -d
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

## Environment-Specific Configurations

### Development
```env
NODE_ENV=development
VITE_API_URL=http://localhost:3000
VITE_DEBUG=true
```

### Staging
```env
NODE_ENV=staging
VITE_API_URL=https://staging-api.example.com
VITE_DEBUG=false
```

### Production
```env
NODE_ENV=production
VITE_API_URL=https://api.example.com
VITE_DEBUG=false
```

## Performance Optimization

### Build Optimization
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['monaco-editor', 'mermaid'],
          ai: ['@google/genai'],
          collaboration: ['@liveblocks/client', 'yjs']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

### CDN Configuration
```html
<!-- Preload critical resources -->
<link rel="preload" href="/assets/monaco-editor.js" as="script">
<link rel="preload" href="/assets/mermaid.js" as="script">

<!-- DNS prefetch for external services -->
<link rel="dns-prefetch" href="//generativelanguage.googleapis.com">
<link rel="dns-prefetch" href="//liveblocks.io">
```

## Monitoring và Analytics

### Error Tracking với Sentry
```typescript
// main.ts
import * as Sentry from "@sentry/browser";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
  });
}
```

### Analytics với Google Analytics
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## Security Considerations

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com;
               style-src 'self' 'unsafe-inline';
               connect-src 'self' https://generativelanguage.googleapis.com https://liveblocks.io;
               img-src 'self' data:;
               font-src 'self';
               object-src 'none';
               base-uri 'self';
               form-action 'self';">
```

### Environment Variable Security
- Never commit `.env` files
- Use secrets management cho production
- Rotate API keys regularly
- Monitor API usage

## Troubleshooting Deployment

### Common Issues

#### Build Failures
```bash
# Clear cache
rm -rf node_modules bun.lockb
bun install

# Check environment variables
echo $VITE_GOOGLE_AI_API_KEY
```

#### Runtime Errors
```javascript
// Check browser console
// Verify API keys
// Check network requests
// Validate environment configuration
```

#### Performance Issues
```bash
# Analyze bundle size
bun run build
bun run analyze

# Check lighthouse scores
lighthouse https://your-domain.com
```

### Health Checks
```typescript
// health-check.ts
export async function healthCheck(): Promise<boolean> {
  try {
    // Check critical dependencies
    const tests = [
      () => typeof monaco !== 'undefined',
      () => typeof mermaid !== 'undefined',
      () => localStorage.getItem('googleAiApiKey') !== null
    ];
    
    return tests.every(test => test());
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}
``` 