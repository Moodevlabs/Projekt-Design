import { describe, expect, it } from 'vitest';
import {
  MAX_FILE_BYTES,
  buildStoragePath,
  fileExtension,
  formatBytes,
  isAllowedExtension,
  isPreviewableImage,
  rejectionFor,
} from './schema';

describe('fileExtension', () => {
  it('bierze ostatnie rozszerzenie i sprowadza do malych liter', () => {
    expect(fileExtension('rzut.PDF')).toBe('pdf');
    expect(fileExtension('archiwum.tar.gz')).toBe('gz');
  });

  it('plik bez rozszerzenia nie ma rozszerzenia', () => {
    expect(fileExtension('README')).toBe('');
    expect(fileExtension('kropka.')).toBe('');
  });

  it('nazwa zaczynajaca sie od kropki to nie rozszerzenie', () => {
    // `.gitignore` to nazwa pliku, a nie plik o rozszerzeniu `gitignore`.
    expect(fileExtension('.gitignore')).toBe('');
  });
});

describe('isAllowedExtension', () => {
  it('przepuszcza to, z czym pracuje projektant', () => {
    for (const name of ['rzut.pdf', 'zdjecie.jpg', 'umowa.docx', 'model.skp', 'zestawienie.xlsx']) {
      expect(isAllowedExtension(name)).toBe(true);
    }
  });

  it('blokuje pliki wykonywalne — takze pisane wielkimi literami', () => {
    for (const name of ['wirus.exe', 'setup.MSI', 'skrypt.BAT', 'payload.js']) {
      expect(isAllowedExtension(name)).toBe(false);
    }
  });
});

describe('rejectionFor', () => {
  it('przepuszcza normalny plik', () => {
    expect(rejectionFor({ name: 'rzut.pdf', size: 1024 })).toBeNull();
  });

  it('odbija za duzy plik', () => {
    expect(rejectionFor({ name: 'film.mp4', size: MAX_FILE_BYTES + 1 })).toBe('too_large');
  });

  it('plik dokladnie na granicy przechodzi', () => {
    expect(rejectionFor({ name: 'film.mp4', size: MAX_FILE_BYTES })).toBeNull();
  });

  it('odbija pusty plik', () => {
    expect(rejectionFor({ name: 'pusty.txt', size: 0 })).toBe('empty');
  });

  it('rozszerzenie wygrywa z rozmiarem — powod ma byc konkretny', () => {
    // Maly `.exe` ma sie odbic jako zablokowany typ, a nie „za duzy".
    expect(rejectionFor({ name: 'setup.exe', size: 10 })).toBe('blocked_extension');
  });
});

describe('buildStoragePath', () => {
  const args = {
    workspaceId: '11111111-1111-4111-8111-111111111111',
    clientId: '22222222-2222-4222-8222-222222222222',
    fileId: '33333333-3333-4333-8333-333333333333',
    fileName: 'rzut.pdf',
  };

  it('zaczyna sie od workspace_id — na tym stoi RLS bucketa', () => {
    const path = buildStoragePath({ ...args, projectId: null });
    expect(path.split('/')[0]).toBe(args.workspaceId);
  });

  it('plik bez projektu ma podkreslnik w miejscu teczki', () => {
    expect(buildStoragePath({ ...args, projectId: null })).toBe(
      `${args.workspaceId}/${args.clientId}/_/${args.fileId}.pdf`,
    );
  });

  it('plik w projekcie niesie jego id', () => {
    const projectId = '44444444-4444-4444-8444-444444444444';
    expect(buildStoragePath({ ...args, projectId })).toContain(`/${projectId}/`);
  });

  it('nazwa w sciezce jest LOSOWA, nie od uzytkownika', () => {
    // Dwa „rzut.pdf" w jednym projekcie nie moga sie nadpisac. Nazwe widoczna
    // trzyma kolumna `name`, wiec zmiana nazwy nie rusza obiektu.
    const path = buildStoragePath({ ...args, projectId: null });
    expect(path).not.toContain('rzut');
    expect(path).toContain(args.fileId);
  });

  it('plik bez rozszerzenia nie dostaje kropki na koncu', () => {
    const path = buildStoragePath({ ...args, projectId: null, fileName: 'README' });
    expect(path.endsWith(args.fileId)).toBe(true);
  });
});

describe('isPreviewableImage', () => {
  it('poznaje obraz po MIME', () => {
    expect(isPreviewableImage('image/png', 'cokolwiek')).toBe(true);
  });

  it('poznaje obraz po rozszerzeniu, gdy MIME nie przyszedl', () => {
    // Sciezka z Tauri nie niesie MIME — zostaje nazwa.
    expect(isPreviewableImage('', 'wizualizacja.JPG')).toBe(true);
  });

  it('PDF to nie obraz', () => {
    expect(isPreviewableImage('application/pdf', 'rzut.pdf')).toBe(false);
  });
});

describe('formatBytes', () => {
  it('bajty tylko ponizej kilobajta', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('uzywa przecinka, nie kropki', () => {
    expect(formatBytes(2_516_582)).toBe('2,4 MB');
  });

  it('powyzej 10 jednostek rezygnuje z ulamka', () => {
    expect(formatBytes(50 * 1024 * 1024)).toBe('50 MB');
  });

  it('2 GiB pokazuje jako gigabajty, nie 2048 MB', () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2 GB');
  });
});
