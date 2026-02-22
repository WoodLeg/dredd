import { CinematicLoader } from "@/components/ui/cinematic-loader";

export default function Loading() {
  return (
    <CinematicLoader
      status="Scan des archives..."
      detail="Inventaire des dossiers en cours"
    />
  );
}
