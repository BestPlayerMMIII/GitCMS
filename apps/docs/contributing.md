# Contributing

We welcome contributions to GitCMS! This guide will help you get started.

## Ways to Contribute

- 🐛 **Report Bugs**: Open an issue on GitHub
- 💡 **Suggest Features**: Share your ideas in discussions
- 📝 **Improve Documentation**: Submit PRs for docs
- 🔧 **Fix Issues**: Pick an issue and submit a PR
- 🎨 **Improve UI/UX**: Enhance the admin panel

## Development Setup

```bash
# Clone repository
git clone https://github.com/BestPlayerMMIII/GitCMS.git
cd GitCMS

# Install dependencies
npm install

# Build all packages
npm run build

# Run development servers
npm run dev
```

## Project Structure

```
GitCMS/
├── apps/
│   ├── docs/          # Documentation website (VitePress)
│   └── ...
├── packages/
│   ├── admin/         # Admin panel (Next.js)
│   ├── client/        # Client SDK
│   └── core/          # Core utilities
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests if applicable
5. Update documentation if needed
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## Code Style

- Use TypeScript
- Follow existing code style
- Run `npm run lint` before committing
- Use meaningful commit messages

## Reporting Issues

When reporting bugs, include:

- GitCMS version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable

## Questions?

- Open a [Discussion](https://github.com/BestPlayerMMIII/GitCMS/discussions)
- Check existing [Issues](https://github.com/BestPlayerMMIII/GitCMS/issues)

## License

By contributing, you agree that your contributions will be licensed under the
MIT License.
