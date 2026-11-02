# Demo film

A short Remotion film for trying mographc: a headline, a chat window, and a cursor that types a prompt and clicks _Send_.

There are two compositions:

- `Demo` is the finished film. It passes the compiler, the linter and the tests.
- `DemoBroken` is the same film with three bugs: the cursor jumps 300 px in one frame, it clicks beside the button instead of on it, and at the end it fades out where it stands instead of leaving the canvas.

```bash
npm run build                 # in the repository root, once
cd examples/demo && npm install
npm run verify                # Demo: passes
npm run verify:broken         # DemoBroken: 2 lint errors and 4 failing tests
npm run dev                   # opens Remotion Studio
```

The tests are in [`src/demo.mographc.ts`](src/demo.mographc.ts). They read the film's beat times from `Demo.tsx`, so the film and its tests can't drift apart. `verify:broken` sets `MOGRAPHC_FILM=DemoBroken` to point the same tests at the broken film.

The bugs are switched on by the `broken` prop in [`src/Demo.tsx`](src/Demo.tsx); search for "Bug".
