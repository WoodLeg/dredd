import { AdminPanel } from "@/components/admin-panel";
import { PageLayout } from "@/components/page-layout";

interface AdminPageClientProps {
  poll: {
    id: string;
    question: string;
    voterCount: number;
    isClosed: boolean;
  };
}

export function AdminPageClient({ poll }: AdminPageClientProps) {
  return (
    <PageLayout>
      <main className="w-full max-w-lg flex flex-col gap-8 animate-fade-in-up">
        <AdminPanel
          pollId={poll.id}
          question={poll.question}
          voterCount={poll.voterCount}
          isClosed={poll.isClosed}
        />
      </main>
    </PageLayout>
  );
}
