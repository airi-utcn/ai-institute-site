# AIRi@UTCN Institute Website

The official website for the Artificial Intelligence Research Institute (AIRI) at the Technical University of Cluj-Napoca. 

The main goal of this project is to provide a platform that is as easy and as self-sufficient as possible, to display the research output of our institute and to attract new talent. 

The website is built with a Next.js frontend and a Strapi CMS backend, and it includes a custom automatic pipeline for syncing publications from OpenAlex and generating a similarity graph.

This repository has three main parts:

- `web/` - the Next.js frontend
- `server/` - the Strapi CMS backend
- `research-paper-graph/` - the publication sync and similarity graph pipeline

## Start Here

If you want the full local development workflow, use [SETUP.md](SETUP.md). If you only need the publication pipeline, use [research-paper-graph/README.md](research-paper-graph/README.md).

### Quick Start

1. Copy the environment template: `cp .env.example .env`
2. Fill in the Strapi URL values and `STRAPI_API_TOKEN`
3. Start the stack: `docker compose up --build`

After the first Strapi boot, create an admin account at `/strapi/admin` and rebuild.

### Documentation

- [SETUP.md](SETUP.md) - detailed development and troubleshooting guide
- [research-paper-graph/README.md](research-paper-graph/README.md) - publication sync and graph pipeline usage
- [docs/paper-graph-generation.md](docs/paper-graph-generation.md) - graph generation details
- [docs/paper-sync-cli-guide.md](docs/paper-sync-cli-guide.md) - research paper graph CLI reference

### Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Support

For questions or issues:

- Check existing [GitHub Issues](../../issues)
- Review the [SETUP.md](./SETUP.md) troubleshooting section
- Reach out to the project maintainers

## License

Unknown for the moment. Standby

---

Built with ❤️ by students and researchers at Technical University of Cluj-Napoca
