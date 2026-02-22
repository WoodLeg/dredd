import { CinematicLoader } from "@/components/ui/cinematic-loader";

export default function Loading() {
  return (
    <CinematicLoader
      status="Recuperation du verdict..."
      detail="Consultation des deliberations"
      showProgress={false}
    />
  );
}
