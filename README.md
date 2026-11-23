# Oxford SynBio website

The site of the Oxford University Society of Synthetic Biology, served by GitHub Pages at https://oxfordsynbio.org/.

It is plain HTML, CSS and one small script. There is nothing to install or build: edit a file, commit, push, and the site updates a minute later.

## Files

- `index.html`: all of the text. Each section has a comment saying how to edit it.
- `styles.css`: the look. The palette, typefaces and other design decisions are written out at the top.
- `main.js`: the live plot in the hero figure.
- `assets/video/`: `reel.mp4` plays behind the hero and `reel-join.mp4` behind the join section. Each has a `-small` copy for phones and a `-poster.jpg` still. They are cut from the clips in `assets/stock-vids/`, which are kept out of git because they are large.
- `assets/img/igem/`: iGEM photos.
- `assets/img/people/`: committee photos.
- `assets/fonts/`: Newsreader and IBM Plex, self-hosted (SIL Open Font License).

## Previewing on your own computer

    python3 -m http.server 8000

then open http://localhost:8000.

## Common edits

- **iGEM photo**: replace `assets/img/igem/2026-team-jamboree.jpg`, or change the `<img>` in the iGEM section of `index.html`.
- **iGEM results**: add a `<tr>` to the table in the iGEM section.
- **A new committee member**: copy a `<div class="row">` block in the committee section and put a square photo in `assets/img/people/`.
- **WhatsApp button**: it is switched off until there is an invite link. Search `index.html` for `REPLACE-WITH-INVITE-CODE` and follow the comment there.
