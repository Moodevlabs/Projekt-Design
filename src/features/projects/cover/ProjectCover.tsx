import { useState } from 'react';
import { useFileUrl } from '@/data/queries/useFiles';
import { cn } from '@/lib/utils';
import { ProjectPlaceholder } from './ProjectPlaceholder';

/**
 * Okładka projektu (T-131): zdjęcie z plików albo placeholder wg typu.
 *
 * Jeden komponent dla trzech miejsc — miniatura w tabeli (56×40), kafel na
 * pulpicie i kadr na karcie projektu — żeby projekt wyglądał tak samo
 * wszędzie, gdzie się pojawia. Rozmiar i proporcję nadaje wołający przez
 * `className` (`aspect-*`, `size-*`); tu jest tylko zaokrąglenie i kadrowanie.
 *
 * Ścieżka przychodzi z widoku `projects_overview` (`coverPath`) albo z
 * `resolveCover` na karcie — obie liczą to samo. Podpisany URL żyje godzinę
 * i jest cache'owany w TanStack (`useFileUrl`), więc lista 30 projektów nie
 * podpisuje 30 razy przy każdym renderze.
 *
 * Gdy obraz nie chce się wczytać (podpis wygasł, plik zniknął), wracamy do
 * placeholdera — pusta ramka wyglądałaby jak błąd, a rysunek mówi „projekt
 * bez zdjęcia", co jest prawdą.
 */
export function ProjectCover({
  path,
  kind,
  alt,
  className,
}: {
  path: string | null;
  kind: string;
  alt: string;
  className?: string;
}) {
  const url = useFileUrl(path);
  const [failed, setFailed] = useState(false);

  const showImage = Boolean(path) && Boolean(url.data) && !failed;

  return (
    <div
      className={cn(
        'border-hair bg-beige relative overflow-hidden rounded-[var(--radius-control)] border',
        className,
      )}
      data-testid="project-cover"
      data-source={showImage ? 'image' : 'placeholder'}
    >
      {showImage ? (
        <img
          src={url.data ?? undefined}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <ProjectPlaceholder kind={kind} className="absolute inset-0" />
      )}
    </div>
  );
}
