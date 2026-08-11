# newellize

It turns images into Gabe Newell. That is the whole thing.

Live: <https://mithrilbytes.github.io/newellize/>

A parody of [obamify](https://github.com/Spu7Nix/obamify) by Spu7Nix, which did
this to Obama first and called the mechanism "magic". We have lawyers now, so we
have to be more specific.

## What it does

There are seven sample images. Each one is taken apart and reassembled into Gabe.
No pixels are added. No pixels are removed. Every pixel of the result came from
the source image and was asked, politely, to stand somewhere else. This is legal.

## How it does it

1. The image and the portrait get chopped into a grid.
2. The brightest pixel is sent where the brightest pixel is needed. Repeat 16,384 times.
3. A Web Worker then tries about fifty million swaps, keeping each one only if it
   makes the image more Gabe. This is called an algorithm.
4. The pixels fly to their new homes. Slowly. It is important that it is slow.

While the math happens you get a loading circle, because watching an optimizer
work is like watching soup boil.

The proximity slider decides how attached your pixels are to home. At 0 they
abandon everything for him. At 100 they mostly stay put and Gabe merely haunts
the image.

## Controls

play plays it. reverse unplays it. auto plays all seven forever, which is the
recommended way to live.

## Why no uploads

People on the internet are bad people.

## Running it locally

It is a folder of files. Double-click index.html, or:

    python3 -m http.server 4173

No build. No dependencies. No node_modules with nine thousand items in it.

## Swapping the target

    ./tools/embed.sh someone_else.jpg

This re-embeds the portrait as base64, which is also the trick that lets the
whole thing run from file:// without the canvas throwing a tantrum.

## Credits

- [obamify](https://github.com/Spu7Nix/obamify) by Spu7Nix. The original science.
- The portrait is the Valve press photo everyone has seen, used as fan parody.
  Valve, if you are reading this, we accept exposure in Half-Life 3 as payment.
- Not affiliated with Valve or Gabe Newell.
- Code is MIT, see [LICENSE](LICENSE).
