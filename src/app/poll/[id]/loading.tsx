import { CinematicLoader } from "@/components/ui/cinematic-loader";

export default function Loading() {
  return (
    <CinematicLoader
      status="Chargement du dossier..."
      detail="Accession aux archives du Tribunal"
    />
  );
}
