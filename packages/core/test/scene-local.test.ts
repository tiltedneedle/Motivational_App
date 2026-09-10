import { describe, expect, it } from 'vitest';
import { LocalProvider, guarded } from '../src/index';

const IDEAL =
  'It is 6:40 and the kitchen is still blue. I am out the back door before the kettle boils, and I run the towpath as far as the second bridge.';

describe('the scene the device draws when there is no model', () => {
  it('survives its own guard', async () => {
    // The guard requires a real sourced detail and requires the narrative to
    // use it. The local fallback has to satisfy the same rule the remote one
    // does, or hardening the guard silently empties the feature.
    const out = await guarded(new LocalProvider()).scene({
      goalTitle: 'Half marathon',
      impactLine: 'Sam would stop worrying about me',
      idealExcerpt: IDEAL,
      type: 'practice',
    });
    expect(out.narrative.length).toBeGreaterThan(20);
    expect(out.sourcedDetail.length).toBeGreaterThan(0);
    expect(IDEAL.toLowerCase()).toContain(out.sourcedDetail.toLowerCase());
    expect(out.narrative.toLowerCase()).toContain(out.sourcedDetail.toLowerCase());
  });

  it('draws all four kinds of scene', async () => {
    const ai = guarded(new LocalProvider());
    for (const type of ['practice', 'moment', 'tuesday', 'other_road'] as const) {
      const out = await ai.scene({
        goalTitle: 'Half marathon',
        impactLine: 'Sam would stop worrying about me',
        idealExcerpt: IDEAL,
        type,
      });
      expect(out.narrative.length, type).toBeGreaterThan(20);
    }
  });

  it('cuts the quoted detail where it still reads as a phrase', async () => {
    // The scene says "You remember writing about X", so X has to be a noun
    // phrase. This used to return "the kitchen is still" out of "the kitchen is
    // still blue" and hand the person their own sentence chopped in half.
    const out = await guarded(new LocalProvider()).scene({
      goalTitle: 'Half marathon',
      impactLine: 'Sam would stop worrying about me',
      idealExcerpt: IDEAL,
      type: 'practice',
    });
    const last = out.sourcedDetail.trim().split(/\s+/).pop()?.toLowerCase() ?? '';
    expect(['is', 'was', 'and', 'the', 'a', 'to', 'of', 'still']).not.toContain(last);
    expect(IDEAL.toLowerCase()).toContain(out.sourcedDetail.toLowerCase());
  });

  it('says nothing rather than inventing a life when there is nothing to quote', async () => {
    const out = await guarded(new LocalProvider()).scene({
      goalTitle: 'Half marathon',
      impactLine: '',
      idealExcerpt: '',
      type: 'practice',
    });
    // No detail of theirs means no scene. An empty narrative is the signal to
    // the screen to show its typographic card instead of a picture of a life
    // that is not this person's.
    expect(out.narrative).toBe('');
  });
});
