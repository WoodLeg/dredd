import { CinematicLoader } from "@/components/ui/cinematic-loader";

export default function Loading() {
  return (
    <CinematicLoader
      status="Acces au tribunal..."
      detail="Verification des accreditations"
    />
  );
}
