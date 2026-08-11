# newellize

Turn anything into the President of Valve.

A parody of [obamify](https://github.com/Spu7Nix/obamify) by Spu7Nix. The app
rearranges the pixels of sample images into Gabe Newell and loops the whole set on
its own. Pick a sample to jump, press play to rewatch, check reverse to run the
morph backward. Every pixel of a result is a pixel of the source image, used exactly
once. Nothing added, nothing lost, only rearranged.

## Run

No build, no dependencies. Double-click `index.html`, or:

```bash
python3 -m http.server 4173
```

## How it works

1. The source and the portrait are downscaled to an N by N grid (64 to 160).
2. Initial assignment: the k-th brightest source pixel goes to the k-th brightest cell.
3. A Web Worker refines it with millions of pair swaps and 3-cycle rotations under
   threshold accepting. A move survives if it lowers weighted RGB error plus
   proximity importance times distance squared. The solver never draws to the stage.
   While it runs you get a loading circle.
4. The permutation plays as a physics morph, modeled on obamify's morph_sim: every
   pixel starts at once, pulled toward its cell by a force that ramps cubically with
   time (per pixel ramp rate, so arrivals stagger naturally), with damping and a
   speed cap. The raw sample stays underneath as a ghost so the frame keeps full
   coverage while pixels flow. obamify does that part with a GPU Voronoi jump flood.
   Every sample precomputes in the background, so switching presets is instant.

The proximity slider is straight from obamify. At 0 you get maximum Gabe. At 100 the
pixels barely leave home and only a faint Gabe haunts the image.

## Why no uploads

Inputs are curated samples only, generated in code and chosen to cover the palette and
value range the portrait needs. People on the internet are bad people.

## Swap the target

```bash
./tools/embed.sh path/to/portrait.jpg
```

Regenerates `assets/gaben.js`, the embedded base64 target. The embed is also what lets
the app run from file:// without canvas tainting.

## Credits

- Concept: [obamify](https://github.com/Spu7Nix/obamify) by [Spu7Nix](https://github.com/Spu7Nix).
- Portrait: the widely circulated Valve press photo of Gabe Newell, © Valve, used as
  non-commercial fan parody. A fully free alternative is the
  [CC BY 2.0 GDC 2010 photo](https://commons.wikimedia.org/wiki/File:Gabe_Newell_GDC_2010_(cropped_2).jpg).
- Not affiliated with Valve Corporation.
- Code: MIT, see [LICENSE](LICENSE).
