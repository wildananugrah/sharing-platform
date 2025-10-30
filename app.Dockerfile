# 1. Base image
FROM node:20-alpine AS base

# 2. Set working directory
WORKDIR /app

# 3. Install dependencies early to leverage caching
COPY package.json package-lock.json ./
RUN npm ci

# 4. Copy the rest of your app
COPY . .

# RUN chmod -R 777 public/uploads

# 5. Build Prisma client (before build so it can be used during app build)
RUN npx prisma generate

# 6. Build the Next.js app
RUN npm run build

# 7. Set environment for production
ENV NODE_ENV=production

# 7.5. Create logs directory with proper permissions
# RUN mkdir -p /app/logs && chmod -R 777 /app/logs

# 8. Expose port
EXPOSE 3000

# 8.5. Install curl for healthcheck
RUN apk add --no-cache curl

# 8.6. Add healthcheck
# HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
#   CMD curl -f http://localhost:3000/api/health/ready || exit 1

# Add this to your Dockerfile before CMD
# RUN echo '#!/bin/sh\nmkdir -p /app/public/uploads\nchmod -R 777 /app/public/uploads\nexec "$@"' >/entrypoint.sh &&
#     chmod +x /entrypoint.sh

# ENTRYPOINT ["/entrypoint.sh"]

# 9. Run the app
CMD ["npm", "start"]
