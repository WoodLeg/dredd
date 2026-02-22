import { CinematicLoader } from "@/components/ui/cinematic-loader";

export default function Loading() {
  return (
    <CinematicLoader
      status="Accès au tribunal..."
      detail="Vérification des accréditations"
    />
  );
}
