# newellize

It turns images into Gabe Newell. That is the whole thing.

Live: <https://mithrilbytes.github.io/newellize/>

A parody of [obamify](https://github.com/Spu7Nix/obamify) by Spu7Nix, which
calls its mechanism "magic". Ours is also magic, but with more steps.

## The technology

Seven images. Each one gets taken apart and rebuilt into Gabe. No pixels added,
none removed. Every pixel is just asked to stand somewhere else. This is legal.

1. Chop everything into a grid.
2. Send bright pixels where bright pixels are needed.
3. Try fifty million swaps. Keep the ones that make it more Gabe.
4. Let the pixels fly home. Slowly. The slowness is the product.

The solver hides behind a loading circle because watching an optimizer work is
like watching soup boil.

The proximity slider sets how attached pixels are to home. At 0 they leave
everything for him. At 100 Gabe merely haunts the image.

## Controls

play plays it. reverse unplays it. auto plays all seven forever, which is the
recommended way to live.

## Run it locally

Double-click index.html. That is it. No build, no dependencies, no node_modules
the size of a moon.

## Change the target

    ./tools/embed.sh someone_else.jpg

Embeds any portrait as base64. The math does not care who it builds.

## Credits

- [obamify](https://github.com/Spu7Nix/obamify) by Spu7Nix. The original science.
- Portrait: the Valve press photo everyone has seen. Fan parody. Valve, we
  accept exposure in Half-Life 3 as payment.
- Not affiliated with Valve or Gabe Newell.
- MIT, see [LICENSE](LICENSE).
