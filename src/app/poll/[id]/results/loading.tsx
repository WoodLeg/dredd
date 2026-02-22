import { CinematicLoader } from "@/components/ui/cinematic-loader";

export default function Loading() {
  return (
    <CinematicLoader
      status="Récupération du verdict..."
      detail="Consultation des délibérations"
      showProgress={false}
    />
  );
}
