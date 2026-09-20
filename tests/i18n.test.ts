import { localDictionaries, SUPPORTED_LANGUAGES } from '@/i18n/languages';
import { createTranslator, interpolate } from '@/i18n/translate';
import { fetchRemoteTranslations, mergeTranslationVersions } from '@/i18n/translationService';
import { apiGet } from '@/services/api/client';
import { accessCodeMessage } from '@/utils/accessMessage';

jest.mock('@/services/api/client', () => ({
  apiGet: jest.fn(),
  registerApiContext: jest.fn(),
}));

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>;

function keysOf(tree: unknown, prefix = ''): string[] {
  if (typeof tree !== 'object' || tree === null) return [prefix];
  return Object.entries(tree).flatMap(([key, value]) => keysOf(value, prefix ? `${prefix}.${key}` : key));
}

describe('translations', () => {
  it('local dictionaries share exactly the same keys', () => {
    const reference = keysOf(localDictionaries.fr).sort();
    for (const language of SUPPORTED_LANGUAGES) {
      expect(keysOf(localDictionaries[language]).sort()).toEqual(reference);
    }
  });

  it('prefers the backend text, then the local language, then French', () => {
    const { t } = createTranslator({
      remote: { mobile: { auth: { loginTitle: 'Connexion (serveur)' } } },
      local: { mobile: { auth: { loginTitle: 'تسجيل الدخول' } } },
      reference: localDictionaries.fr,
    });
    expect(t('mobile.auth.loginTitle')).toBe('Connexion (serveur)');

    const offline = createTranslator({ remote: null, local: localDictionaries.ar, reference: localDictionaries.fr });
    expect(offline.t('mobile.auth.loginTitle')).toBe('تسجيل الدخول');

    const partial = createTranslator({ remote: null, local: {}, reference: localDictionaries.fr });
    expect(partial.t('mobile.auth.loginTitle')).toBe('Connexion');
  });

  it('interpolates the backend [param] syntax', () => {
    expect(interpolate('[count] non lues', { count: 3 })).toBe('3 non lues');
    expect(interpolate('Mis à jour à 12:30 par [name]', { name: 'Ali' })).toBe('Mis à jour à 12:30 par Ali');
  });

  it('merges version 2 texts with the access subtree of version 1', () => {
    const merged = mergeTranslationVersions(
      { menu: { home: 'Accueil' }, access: { errors: { X: 'v2' } } },
      { access: { errors: { X: 'v1', Y: 'v1' } }, other: 'ignored' },
    );
    expect(merged).toEqual({ menu: { home: 'Accueil' }, access: { errors: { X: 'v2' } } });
    expect(mergeTranslationVersions({}, { access: { a: 1 } })).toEqual({ access: { a: 1 } });
  });

  it('parses dictionaries that axios handed back as raw text', async () => {
    mockedApiGet
      .mockResolvedValueOnce('{"menu":{"home":"Accueil"}}')
      .mockResolvedValueOnce('not json at all');
    await expect(fetchRemoteTranslations('fr')).resolves.toEqual({ menu: { home: 'Accueil' } });
  });

  it('uses access.errors.* from the backend before the local fallback', () => {
    const translator = createTranslator({
      remote: { access: { errors: { QUOTA_EXCEEDED: 'Limite atteinte ([used]/[limit])' } } },
      local: localDictionaries.fr,
      reference: localDictionaries.fr,
    });
    expect(accessCodeMessage('QUOTA_EXCEEDED', null, translator, { used: 5, limit: 5 })).toBe(
      'Limite atteinte (5/5)',
    );
    const local = createTranslator({ remote: null, local: localDictionaries.fr, reference: localDictionaries.fr });
    expect(accessCodeMessage('PERMISSION_DENIED', null, local)).toBe(
      'Votre rôle ne permet pas cette action. Contactez votre responsable.',
    );
  });
});
