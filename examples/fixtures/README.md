# Rule fixtures

Small Remotion films that each show one problem a rule should report, next to a fixed version that it shouldn't. They're used to check rules when they're added or changed.

| Rule                    | Shows the problem                                                                                                                            | Fixed                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `layout/tight-spacing`  | `TightSpacing`: a heading 7 px above a code panel, and a command line 6 px below a chat bubble                                               | `TightSpacingFixed`                                                                     |
| `layout/text-overlap`   | `BriefOverlap`: one caption replaces another with both fully drawn for one frame                                                             | `BriefOverlapFixed`, and `BriefOverlapCrossfade`, a two-frame crossfade at half opacity |
| `staging/empty-surface` | `EmptySurface`: a large panel with its three lines of content in the top-left corner                                                         | `EmptySurfaceFixed`                                                                     |
| `staging/small-focus`   | `SmallFocus`: a request in a chat bubble, about 4% of the canvas, read in a wide shot of a large window                                      | `SmallFocusFixed`, which pushes in on the bubble                                        |
| `cursor/covers-text`    | `CursorOnText`: the cursor clicks a button and stays on its label                                                                            | `CursorOnTextFixed`, which moves it aside                                               |
| `layout/text-cut`       | `CutText`: a button label with its last letter cut off, a paragraph cut through its last line, and a sliver of a list row at a window's edge | `CutTextFixed`                                                                          |

```bash
npm run build                 # in the repository root, once
cd examples/fixtures && npm install
npm test                      # each rule reports its film and not the fixed one
npx mographc lint TightSpacing  # the findings for one film
```
