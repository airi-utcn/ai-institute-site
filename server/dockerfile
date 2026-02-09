# Use AWS ECR Public mirror to avoid Docker Hub rate limits
FROM public.ecr.aws/docker/library/node:22-alpine

RUN apk update && apk upgrade --no-cache

WORKDIR /app
COPY . .

# Build-time config for Strapi admin bundle. Compose runtime env does NOT apply during `docker build`.
ARG PUBLIC_STRAPI_URL
ARG STRAPI_ADMIN_URL
ENV PUBLIC_STRAPI_URL=$PUBLIC_STRAPI_URL
ENV STRAPI_ADMIN_URL=$STRAPI_ADMIN_URL

RUN npm install
RUN npm run build

EXPOSE 1337
# Run in production mode (serve the built admin). Use `develop` only for local development.
CMD ["npm", "start"]