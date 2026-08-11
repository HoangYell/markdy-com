# Third-party notices

`src/nodes.ts` contains a small, read-only registry of inline monochrome SVG
path data. The package does not fetch icon code at runtime or bundle external
logo files. Hosts can override any node with `image=` / `logo=`.

Some generic glyph motifs are adapted from redistributable upstream libraries:

- [Tabler Icons](https://tabler.io/icons) — MIT License
- [Simple Icons](https://simpleicons.org/) — CC0 1.0
- [Devicon](https://github.com/devicons/devicon) — MIT License

These notices remain with the package so downstream distributions preserve
upstream attribution and license terms.
