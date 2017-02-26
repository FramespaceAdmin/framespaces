# Framespaces

A collaborative conceptual design tool.

# Development
1. Install node.js (v4 LTS).
2. Check out the source into a local folder.
3. In the root: `npm install`
4. `npm run start:dev`
5. Go to `http://localhost:3000`

To re-start, `npm run restart:dev`

See `package.json` for other exciting scripts.

## Dependencies
Browser tabs I have permanently open:
- https://nodejs.org/api/
- https://lodash.com/docs
- http://caolan.github.io/async/
- http://chaijs.com/api/assert/
- http://snapsvg.io/docs/ (all references to SVG elements and "paper" are Snap objects)

Third-party services for production use:
- Realtime message delivery https://www.ably.io/documentation (for dev & test using http://socket.io/docs/)
- Database (proposed) https://orchestrate.io/docs/ (for dev & test using http://www.taffydb.com/)
- Authentication (proposed) https://auth0.com/docs (for dev & test, rolling our own JWTs)
- Deployment (proposed) https://serverless.com/ (for dev & test, using https://devcenter.heroku.com/)
- Random words http://developer.wordnik.com/docs.html
- Random robots! https://robohash.org/

Also used:

- https://www.npmjs.com/package/kld-affine for Point2D and Vector2D
- https://www.npmjs.com/package/keycode for translating keyboard events
- https://www.npmjs.com/package/svg-intersections for intersecting SVG shapes
- http://browserify.org/ for browser code packaging, with https://github.com/benbria/aliasify

## Conventions
- ES5.1 across both client and server, for consistency
- No strict mode, but conform to it anyway :)
- A leading underscore on a required var denotes a library of functions, e.g. `_` (lodash), `_stat` (jStat)
- A leading capital denotes a class, so expect to see it used with `new`
- Everything else leads with a lowercase letter

## Suggestions
In `/client/suggest`.

Each suggester is a function that takes `(picture, element)` and returns an action: one of `Addition`, `Removal`, `Replacement` or `Mutation` (see `/client/picture.js` and `/client/action`).

The action should also be assigned a  `confidence`: a number between 0 and 1. If > 0.9, the suggestion will be auto-applied. Watch the console in the browser to see how the other suggesters behave.

Note that the action is not performed right away, but only when the suggestion is applied automatically or by the user.

You will also need to create Shapes (`/client/shape/index.js`). See the existing suggesters for examples.

To wire in your suggester, modify `/client/suggest/index.js` in the obvious way.

## Touch & Platform Support
`client/index.js` contains all the event and mouse listening code, and should be the main place things go wrong on other platforms.
