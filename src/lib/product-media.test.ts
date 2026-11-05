import { describe, expect, it } from 'vitest';
import { parseProductMedia } from './product-media';

describe('parseProductMedia', () => {
  it('liest gepflegte Felder', () => {
    expect(parseProductMedia([
      { key: 'bj_datenblatt_url', value: ' https://example.com/a.pdf ' },
      { key: 'anderes_feld', value: 'https://example.com/b.pdf' },
    ])).toEqual({ datenblatt: 'https://example.com/a.pdf' });
  });

  it('ignoriert leere und unsichere Werte', () => {
    expect(parseProductMedia([
      { key: 'bj_datenblatt_url', value: '' },
      { key: 'bj_video_url', value: 'javascript:alert(1)' },
      { key: 'bj_visualizer_url', value: 42 },
    ])).toEqual({});
    expect(parseProductMedia(undefined)).toEqual({});
  });
});
