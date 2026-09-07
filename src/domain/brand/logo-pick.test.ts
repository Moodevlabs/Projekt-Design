import { describe, expect, it } from 'vitest';
import { pickHeaderLogoPath } from './logo-pick';

describe('pickHeaderLogoPath', () => {
  it('bierze wybrany wariant, gdy jest', () => {
    const kit = { logoDarkPath: 'ws/logo-dark.png', logoLightPath: 'ws/logo-light.png' };
    expect(pickHeaderLogoPath(kit, 'dark')).toBe('ws/logo-dark.png');
    expect(pickHeaderLogoPath(kit, 'light')).toBe('ws/logo-light.png');
  });

  it('bez wybranego wariantu bierze drugi — lepszy zły odcień niż pusty pas', () => {
    expect(pickHeaderLogoPath({ logoDarkPath: null, logoLightPath: 'l.png' }, 'dark')).toBe(
      'l.png',
    );
    expect(pickHeaderLogoPath({ logoDarkPath: 'd.png', logoLightPath: null }, 'light')).toBe(
      'd.png',
    );
  });

  it('bez żadnego logo daje null', () => {
    expect(pickHeaderLogoPath({ logoDarkPath: null, logoLightPath: null }, 'dark')).toBeNull();
  });
});
