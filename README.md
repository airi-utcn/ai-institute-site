# AI Institute Website

The official website for the Artificial Intelligence Research Institute (AIRI) at the Technical University of Cluj-Napoca. This platform showcases our research activities, team members, publications, and events while serving as a knowledge hub for students and researchers interested in AI.

## Overview

This project consists of two main components:

- **Frontend** (`web/`) - Next.js application with responsive design and interactive features
- **Backend** (`server/`) - Strapi v5 headless CMS managing all content

The architecture allows researchers and administrators to update content through Strapi's admin panel while the Next.js frontend delivers a fast, modern user experience.

## Tech Stack

**Frontend**

- Next.js 15 + React 19
- Tailwind CSS for styling
- Framer Motion for animations
- React Leaflet for interactive maps (used for the partners page)

**Backend**

- Strapi v5 (Headless CMS)
- PostgreSQL database
- Docker for containerization

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git

### Running with Docker

```bash
# Clone and navigate to the project
git clone <repository-url>
cd ai-institute-site

# Copy environment variables
cp .env.example .env

# Start all services
docker compose up --build

# In another terminal, migrate existing data (first time only)
docker cp web/src/app/data ai-institute-site-strapi-1:/app/migration-data
docker exec -it ai-institute-site-strapi-1 /bin/sh -c \
  "MIGRATION_DATA_ROOT=/app/migration-data node /app/scripts/migrate-json.js"
```

**Access the applications:**

- Frontend: http://localhost:3000
- Strapi Admin: http://localhost:1337/strapi/admin
- Strapi API: http://localhost:1337/api

On first visit to the Strapi admin panel, you'll be prompted to create an admin account.

**One more step**:
Go to settings -> API Tokens -> Read Only -> Copy the Token and put it into the .env at STRAPI_API_TOKEN.
Otherwise, NextJS won't be able to access Strapi.

### Local Development

See [SETUP.md](./SETUP.md) for detailed development instructions and troubleshooting.

## Contributing

We welcome contributions from students and researchers! Whether you're fixing a bug, adding a feature, or improving documentation, your help is appreciated.

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Git workflow and branching strategy
- Code standards and commit conventions
- How to submit pull requests
- Where tasks are tracked

## Project Structure

```
ai-institute-site/
├── web/                 # Next.js frontend application
│   ├── src/app/        # Page routes and components
│   ├── src/components/ # Reusable UI components
│   └── public/         # Static assets
├── server/             # Strapi CMS backend
│   ├── src/api/        # Content type definitions
│   ├── config/         # Strapi configuration
│   └── scripts/        # Utility scripts (migration, etc.)
└── docker-compose.yml  # Container orchestration
```

## Key Features

- **Dynamic Content Management** - Update research, news, and team info through Strapi
- **Responsive Design** - Mobile-friendly navigation and layouts
- **Interactive Elements** - Research unit explorer, timeline, collaboration map
- **Search Functionality** - Find publications, projects, and team members
- **Media Galleries** - Showcase events and institute activities

## Documentation

- [Development Setup](./SETUP.md) - Detailed setup and troubleshooting
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute to the project
- [Strapi Documentation](https://docs.strapi.io/) - Official CMS docs

## Support

For questions or issues:

- Check existing [GitHub Issues](../../issues)
- Review the [SETUP.md](./SETUP.md) troubleshooting section
- Reach out to the project maintainers

## License

Unknown for the moment. Standby

---

Built with ❤️ by students and researchers at Technical University of Cluj-Napoca
