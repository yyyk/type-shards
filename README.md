# type-shards

[![CI](https://github.com/yyyk/type-shards/actions/workflows/ci.yml/badge.svg)](https://github.com/yyyk/type-shards/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Type broken into shards: each letter's outline is cut into pieces, and the
pieces are moved, turned, scaled and stroked, every one by its own seeded
random amount. Export the result as SVG (to paste into Figma) or PNG.

**[Open the app](https://yyyk.github.io/type-shards/)**

## How it works

1. **Text**: the text is laid out with the chosen font and settings, and each
   glyph's outline has its overlaps removed.
2. **Split**: every contour is cut into pieces of about the same length.
3. **Offset**: each piece is moved away from the letter, or into it.
4. **Pieces**: each piece is turned and scaled around its own centre, and a
   share of them can be left out (gaps).
5. **Line**: each piece is drawn as a line of its own width, with caps and
   joins.
6. **Appearance**: drawn as it is, or with a stroke around it, in which case
   the line becomes a filled shape (its outline) with the stroke around that.

The randomness comes from one seed. The same seed and settings always give the
same result, and each step has its own random values, so changing one step
never reshuffles another.

## What it does

The settings are in three tabs: Text, Shards and Output.

- **Text**: any text over several lines, a built-in font (Roboto, Roboto Flex,
  Fraunces, Playfair Display, Bricolage Grotesque, Oswald, Zen Kaku Gothic New,
  Jost, Outfit, Montserrat, Noto Sans) or your own (.ttf, .otf), size, line
  height, letter and word spacing, alignment and wrapping. **Type details** has
  the font's variable axes (Roboto Flex has 13) and its OpenType features.
- **Split, Offset, Pieces, Line, Appearance**: the steps above, each with its
  amounts and jitters.
- **Random**: the seed, with a button to shuffle it.
- **Canvas**: zoom and pan as in Figma: scroll or two-finger drag to pan, pinch
  or ⌘/Ctrl + scroll to zoom, Space + drag to pan; Shift+1 to fit, Shift+0 for
  100%, + and − to zoom. Straight edges are snapped to the pixel grid, so they
  stay crisp.
- **Export**: SVG (the strokes outlined or as lines) or PNG (1× or 2×), with or
  without the background: copy or download.
- **Documents**: undo and redo (⌘Z, ⇧⌘Z), save and open as .json (⌘S, ⌘O).

## Development

Needs Node 20.19+ or 22.12+ (Vite 8's requirement).

```sh
npm install
npm run dev           # dev server
npm run build         # type-check and build into dist/
npm test              # Vitest, watching
npm run test:run      # Vitest, once
npm run lint          # oxlint
npm run format        # Prettier, write
npm run format:check  # Prettier, check only
```

VS Code formats on save with the recommended Prettier extension.

Built with React, TypeScript, Vite, Tailwind CSS and shadcn/ui (Base UI). The
geometry comes from three libraries: [text-shape](https://www.npmjs.com/package/text-shape)
(font loading and layout), [vector-path-tools](https://www.npmjs.com/package/vector-path-tools)
(path measuring, splitting and boolean operations) and
[stroke-outline](https://www.npmjs.com/package/stroke-outline) (stroke outlines).

## Deployment

Every push to `main` builds the app and deploys it to GitHub Pages
(`.github/workflows/pages.yml`); `BASE_PATH` sets the `/<repo>/` prefix. CI
(`.github/workflows/ci.yml`) checks formatting, lint, the tests and the build on
every push and pull request.

## License

[MIT](LICENSE). The fonts in `public/fonts` (Roboto, Roboto Flex, Fraunces,
Playfair Display, Bricolage Grotesque, Oswald, Zen Kaku Gothic New, Jost,
Outfit, Montserrat, Noto Sans) are under the SIL Open Font License, each with
its own `*-OFL.txt`.
